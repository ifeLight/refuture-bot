const ccxt = require ('ccxt'); //The bulk exchange library
const BinanceApiNode = require('binance-api-node').default;

const logger = require('../utils/logger')

const PairInfo = require('../modules/pair/PairInfo')
const Ticker = require('../modules/pair/Ticker');
const OrderBook = require('../modules/pair/OrderBook');
const Balance = require('../classes/Balance');
const Order = require('../modules/pair/Order');

module.exports = class BinanceExchange {
    constructor (eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this.ccxt = ccxt;
        this.name = 'binance';
    }

    async init(config) {
        const { apiKey, apiSecret } = config.get('exchange.binance');
        this.exchange = new ccxt.binance({
            apiKey,
            secret: apiSecret,
            timeout: 30000,
            enableRateLimit: true
        })
        this.exchange.binanceApiNode = BinanceApiNode({
            apiKey, apiSecret
        })

        try {
            await this.exchange.checkRequiredCredentials();
            await this.userWebsocket();
        } catch (error) {
            this.logger.info(`Binance Futures: Incomplete required credentials: ${error.message}`)
        }

    }

    async fetchPairInfo(symbol) {
        try {
            if (!this.markets) {
                this.markets = await this.exchange.fetchMarkets();
            } 
            const pairInfoFromMarket = this.markets.find((market) => market.symbol == symbol);
            const { percentage, taker, maker } = this.exchange.fees.trading;
            const fees = {
                percentage,
                taker,
                maker
            }
            return new PairInfo({...pairInfoFromMarket, fees})

        } catch (error) {
            throw error;
        }
    }

    async fetchCandles(symbol, period, since, to = new Date()) {
        try {
            let sinceTimestamp = new Date(since).getTime();
            let toTimestamp = new Date(to).getTime();
            let ohlcv = [];
            const exchangeName = this.exchange.name;
            while (sinceTimestamp < toTimestamp) {
                const fetchedCandles = await this.exchange.fetchOHLCV(symbol, period, since);
                ohlcv = [...ohlcv, ...fetchedCandles];
                sinceTimestamp = fetchedCandles[fetchedCandles.length - 1][0];
            }

            const mappedCandles = ohlcv.map(function (candle) {
                return {
                    period,
                    exchangeName,
                    symbol,
                    time: candle[0],
                    open: Number(candle[1]),
                    high: Number(candle[2]),
                    low: Number(candle[3]),
                    close: Number(candle[4]),
                    volume: Number(candle[5]),
                }
            })
            return mappedCandles;
        } catch (error) {
            throw error;
        }
    }

    addCandleEvent (symbol, period) {
        const candleEventId = symbol + period; ///To prevent duplicate candle event registration
        if (!this.candleEventsList) {
            this.candleEventsList = []
        }
        try {
            if (this.candleEventsList.indexOf(candleEventId) < 0) {
                this.candleEventsList.push(candleEventId);
                const exchangeName = this.exchange.name
                const retouchedSymbol = this.retouchSymbol(symbol);
                this.exchange.binanceApiNode.ws.candles(retouchedSymbol, period, function (candle) {
                    const retouchedCandle = {
                        period,
                        exchangeName,
                        symbol,
                        time: candle.eventTime,
                        open: Number(candle.open),
                        high: Number(candle.high),
                        low: Number(candle.low),
                        close: Number(candle.close),
                        volume: Number(candle.volume),
                    }
                    this.eventEmitter.emit(`candle_${exchangeName}_${symbol}_${period}`, retouchedCandle);
                })
            }
        } catch (error) {
            this.logger.info(`Binance: Problem adding candle event [${symbol} - ${period}] (${error.message})`)
        }
    }

    async fetchTicker (symbol) {
        try {
            const tickerFromExchange = await this.exchange.fetchTicker(symbol);
            const {
                bid: bidPrice,
                ask: askPrice,
                bidVolume: bidQty,
                askVolume: askQty,
                last: lastPrice
            } = tickerFromExchange;
            return new Ticker({
                bidPrice,
                askPrice,
                bidQty,
                askQty,
                lastPrice
            }) 
        } catch (error) {
            throw error;
        }
    }

    addTickerEvent(symbol) {
        try {
            const exchangeName = this.exchange.name
            const retouchedSymbol = this.retouchSymbol(symbol);
            this.exchange.binanceApiNode.ws.ticker(retouchedSymbol, function (ticker) {
                const {
                    bestBid: bidPrice,
                    bestAsk: askPrice,
                    bestBidQnt: bidQty,
                    bestAskQnt: askQty,
                    curDayClose: lastPrice
                } = ticker;

                const newTicker = new Ticker({
                    bidPrice,
                    askPrice,
                    bidQty,
                    askQty,
                    lastPrice
                }) 
                this.eventEmitter.emit(`ticker_${exchangeName}_${symbol}`, newTicker);
            })
        } catch (error) {
            throw error;
        }
    }

    async fetchMarkPrice(symbol) {

    }

    addMarkPriceEvent(symbol) {

    }

    async fetchOrderBook (symbol) {
        try {
            const orderBookFromExchange = await this.exchange.fetchOrderBook(symbol);
            let {
                bids, asks
            } = orderBookFromExchange;

            bids = bids.map((bid) => {
                return {
                    price: Number(bid[0]),
                    quantity: Number(bid[1])
                }
            })

            asks = asks.map((ask) => {
                return {
                    price: Number(ask[0]),
                    quantity: Number(ask[1])
                }
            })
            return new OrderBook(bids, asks) 
        } catch (error) {
            throw error;
        }
    }

    addOrderBookEvent(symbol) {
        try {
            const exchangeName = this.exchange.name
            const retouchedSymbol = this.retouchSymbol(symbol);
            this.exchange.binanceApiNode.ws.depth(retouchedSymbol, function (depth) {
                let {
                    bidDepth: bids,
                    askDepth: asks
                } = depth;

                bids = bids.map((bid) => {
                    return {
                        price: Number(bid.price),
                        quantity: Number(bid.quantity)
                    }
                })
    
                asks = asks.map((ask) => {
                    return {
                        price: Number(ask.price),
                        quantity: Number(ask.quantity)
                    }
                })

                const newOrderBook = new OrderBook(bids, asks);
                this.eventEmitter.emit(`orderbook_${exchangeName}_${symbol}`, newOrderBook);
            })
        } catch (error) {
            throw error;
        }
    }

    async fetchBalance(asset) {
        try {
            if (!this.balances) {
                const fetchedBalances = (await this.exchange.fetchBalance()).info.balances;
                this.balances = {};
                fetchedBalances.forEach(bal => {
                    const { asset, free, locked } = bal
                    this.balances[asset] = new Balance(asset, free, locked);
                });
                return this.balances[asset];
            }
            return this.balances[asset];
        } catch (error) {
            throw error;
        }
    }

    async createMarketOrder(symbol, side, amount) {
        try {
            const order = await this.exchange.createOrder(symbol, 'market', side, amount);
            return order;
        } catch (error) {
            throw error;
        }
    }

    async createLimitOrder(symbol, side, amount, price) {
        try {
            const order = await this.exchange.createOrder(symbol, 'limit', side, amount, price);
            return order;
        } catch (error) {
            throw error;
        }
    }
    async fetchActiveOrders(symbol) {
        try {
            if (!this.orders) {
                await syncWebsocketOrders();
            }
            return this.orders[symbol];
        } catch (error) {
            this.logger.info(`Binance: Failed to fetch active orders (${error.message})`)
        }
    }

    async cancelActiveOrder(orderId, symbol) {
        try {
            return await this.exchange.cancelOrder(orderId, symbol)
        } catch (error) {
            throw error;
        }
    }

    async cancelActiveOrders(symbol) {
        try {
            const activeOrders = await this.exchange.fetchOpenOrders(symbol);
            for (const order of activeOrders) {
                await this.exchange.cancelOrder(order.id, symbol)
            }
            return true;
        } catch (error) {
            throw error;
        }
    }

    async fetchPositions(symbol) {
        try {
            //const order = await exchange.createOrder(symbol, 'limit', side, amount, price)
        } catch (error) {
            throw error;
        }
    }

    async closePositions (symbol) {
        try {
            //const order = await exchange.createOrder(symbol, 'limit', side, amount, price)
        } catch (error) {
            throw error;
        }
    }
 

    /**
     * Private Functions
     */
    retouchSymbol(symbol) {
        return symbol.search('/') < 0 ? symbol : symbol.split('/')[0] + symbol.split('/')[1]; //Retouched for binance api node module
    }

    async userWebsocket () {
        try {
            const self = this;
            this.exchange.binanceApiNode.ws.user(async (response) => {
                if (response.eventType && response.eventType == 'account') {
                    const balances = response.balances;
                    Object.keys(balances).forEach((asset) => {
                        const { available: free, locked} = balances[asset];
                        if (!self.balances) {
                            self.balances = {};
                        }
                        self.balances[asset] = new Balance(asset, free, locked );
                    })
                }

                if (response.eventType && response.eventType == 'executionReport') {
                    await self.syncWebsocketOrders();
                }
            })
        } catch (error) {
            this.logger.error(`Binance: Failed to start User Websocket (${error.message})`)
        }
    }

    async syncWebsocketOrders () {
        try {
            const self = this;
            if (!this.orders) {
                this.orders = {};
            }
            const fetchedOrders = await this.exchange.fetchOpenOrders();
            const mappedOrders = fetchedOrders.map((order) => {
                return new Order({
                    ...order,
                    time: order.timestamp
                })
            })
            mappedOrders.forEach((order) => {
                const { symbol } = order;
                if (self.orders[symbol] && Array.isArray(self.orders[symbol])) {
                    self.orders[symbol].push(order)
                } else {
                    self.orders[symbol] = [order];
                }
            })
            this.orders[symbol] =  symbolOrders;
            
        } catch (error) {
            this.logger.info(`Binance: Failed to sync websocket orders (${error.message})`)
        }
      }

}

