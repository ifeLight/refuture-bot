const ccxt = require ('ccxt'); //The bulk exchange library
const BinanceApiNode = require('binance-api-node').default;

const logger = require('../utils/logger')

const PairInfo = require('../modules/pair/PairInfo')
const Ticker = require('../modules/pair/Ticker');
const OrderBook = require('../modules/pair/OrderBook');
const Balance = require('../classes/Balance')

module.exports = class BinanceExchange {
    constructor (eventEmitter) {
        // this.eventEmitter = EventEmmitter;
        this.ccxt = ccxt;
        this.name = 'binance';
    }

    init(config) {
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
        try {
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
        } catch (error) {
            throw error;
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
                this.addBalanceEvent(); //To trigger the balance Websocket event
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

    addBalanceEvent () {
        try {
            const clean = await this.exchange.binanceApiNode.ws.user(response => {
                const balances = response.balances;
                Object.keys(balances).forEach((asset) => {
                    const { available: free, locked}
                    this.balances[asset] = new Balance(asset, free, locked );
                })
            })
        } catch (error) {
            throw error;
        }
    }


    // TODO: Working on the order structure
    createMarketOrder(symbol, side, amount) {
        try {
            await this.exchange.createMarketSellOrder (symbol, amount[, params])
        } catch (error) {
            throw error;
        }
    }

    createLimitOrder(symbol, side, amount, price) {
        try {
            const order = await exchange.createOrder (symbol, 'limit', 'buy', amount, price)
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

}
