const ccxt = require ('ccxt'); //The bulk exchange library
const WebSocket = require('ws');
const BinanceApiNode = require('binance-api-node').default;
const NodeBinanceApi = require('node-binance-api');

const PairInfo = require('../modules/pair/PairInfo')
const Ticker = require('../modules/pair/Ticker');
const OrderBook = require('../modules/pair/OrderBook');
const Balance = require('../classes/Balance');
const Order = require('../modules/pair/Order');
const Position = require('../modules/pair/Position');

module.exports = class BinanceFuturesExchange {
    constructor (eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.ccxt = ccxt;
        this.logger = logger;
        this.name = 'binance_futures';
        this.isFutures = true;
    }

    async init(config) {
        const { apiKey, apiSecret } = config.get('exchange.binance');
        this.exchange = new ccxt.binance({
            apiKey,
            secret: apiSecret,
            timeout: 30000,
            enableRateLimit: true,
            options: { defaultType: 'future', warnOnFetchOpenOrdersWithoutSymbol: false }
        })
        this.exchange.binanceApiNode = BinanceApiNode({
            apiKey, apiSecret
        })

        this.exchange.nodeBinanceApi = new NodeBinanceApi().options({
            APIKEY: apiKey,
            APISECRET: apiSecret
          });

        try {
            await this.exchange.checkRequiredCredentials();
            await this.initUserWebsocket();
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
                const query = retouchedSymbol.toLowerCase() + '@kline_' + period;
                this.exchange.nodeBinanceApi.futuresSubscribe(query, function (kline) {
                    const {t, o, c, h, l, v } = kline.k;
                    const retouchedCandle = {
                        period,
                        exchangeName,
                        symbol,
                        time: t,
                        open: Number(o),
                        high: Number(h),
                        low: Number(l),
                        close: Number(c),
                        volume: Number(v),
                    }
                    this.eventEmitter.emit(`candle_${exchangeName}_${symbol}_${period}`, retouchedCandle);
                })
            }
        } catch (error) {
            this.logger.info(`Binance Futures: Problem adding candle event [${symbol} - ${period}] (${error.message})`);
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
            this.exchange.nodeBinanceApi.futuresBookTickerStream(retouchedSymbol, function (ticker) {
                const {
                    bestBid: bidPrice,
                    bestAsk: askPrice,
                    bestBidQnt: bidQty,
                    bestAskQnt: askQty,
                } = ticker;

                const priceDecimalPlaces = bidPrice.split('.')[1].length

                const newTicker = new Ticker({
                    bidPrice,
                    askPrice,
                    bidQty,
                    askQty,
                    lastPrice: Number(((Number(bidPrice) + Number(askPrice)) / 2).toFixed(priceDecimalPlaces))
                }) 
                this.eventEmitter.emit(`ticker_${exchangeName}_${symbol}`, newTicker);
            })
        } catch (error) {
            throw error;
        }
    }

    async fetchMarkPrice(symbol) {
        try {
            const retouchedSymbol = this.retouchSymbol(symbol);
            this.addMarkPriceEvent(symbol);
            const {markPrice} = await this.exchange.nodeBinanceApi.futuresMarkPrice( retouchedSymbol )
            return markPrice
        } catch (error) {
            throw error;
        }
    }

    addMarkPriceEvent(symbol) {
        try {
            const exchangeName = this.exchange.name
            const retouchedSymbol = this.retouchSymbol(symbol);
            this.exchange.nodeBinanceApi.futuresMarkPriceStream(retouchedSymbol, function (stream) {
                const {markPrice} = stream;
                this.eventEmitter.emit(`markprice_${exchangeName}_${symbol}`, markPrice);
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
            const query = retouchedSymbol.toLowerCase() + '@depth@500ms';
            this.exchange.nodeBinanceApi.futuresSubscribe(query, function (depth) {
                let {
                    b: bids,
                    a: asks
                } = depth;

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
                await self.initUserWebsocket();
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

    async changeLeverage(symbol, leverage) {
        try {
            const retouchedSymbol = this.retouchSymbol(symbol);
            const leverageNumber = Number(leverage);
            await this.exchange.nodeBinanceApi.futuresLeverage( retouchedSymbol, leverageNumber )
        } catch (error) {
            this.logger.error('Binance Futures: Unable to change leverage')
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
                this.orders = {};
                const fetchedOrders = await this.exchange.fetchOpenOrders(symbol);
                const symbolOrders = fetchedOrders.map((order) => {
                    return new Order({
                        ...order,
                        time: order.timestamp
                    })
                })
                this.orders[symbol] =  symbolOrders;
                return symbolOrders;
            }
            return this.orders[symbol];
            
        } catch (error) {
            this.logger.info(`Binance Futures: Failed to fetch active orders (${error.message})`)
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
            if (!this.positions) {
                await syncWebsocketPositions();
            }
            return this.positions[symbol];
        } catch (e) {
            this.logger.error(`Binance Futures: error getting positions:${e}`);
            return;
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


    async initUserWebsocket() {
        let response;
        try {
          response = await this.exchange.fapiPrivatePostListenKey();
        } catch (e) {
          this.logger.error(`Binance Futures: listenKey error: ${String(e)}`);
          return undefined;
        }
    
        if (!response || !response.listenKey) {
          this.logger.error(`Binance Futures: invalid listenKey response: ${JSON.stringify(response)}`);
          return undefined;
        }
    
        const self = this;
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${response.listenKey}`);
        ws.onerror = function(e) {
          self.logger.info(`Binance Futures: Connection error: ${String(e)}`);
        };
    
        ws.onopen = function() {
          self.logger.info(`Binance Futures: Opened user stream`);
        };
        
        // User streams manager
        ws.onmessage = async function(event) {
          if (event && event.type === 'message') {
            const message = JSON.parse(event.data);
            //@ts-nocheckconsole.info(message);

            if (message.e && message.e.toUpperCase() === 'ORDER_TRADE_UPDATE') {
                const order = message.o;
                await self.syncWebsocketOrder(order);
                
            }

            if (message.e && message.e.toUpperCase() === 'ACCOUNT_UPDATE') {
                const {B: balances, P: positions} = message.a;
                self.syncWebsocketBalances(balances);
                await self.syncWebsocketPositions();
            }
          }
        };
    
        const heartbeat = setInterval(async () => {
          try {
            await this.exchange.fapiPrivatePutListenKey();
            this.logger.debug('Binance Futures: user stream ping successfully done');
          } catch (e) {
            this.logger.error(`Binance Futures: user stream ping error: ${String(e)}`);
          }
        }, 3000);
    
        ws.onclose = function() {
          self.logger.info('Binance futures: User stream connection closed.');
          clearInterval(heartbeat);
    
          setTimeout(async () => {
            self.logger.info('Binance futures: User stream connection reconnect');
            await self.initUserWebsocket();
          }, 1000 * 30);
        };
    
        return true;
      }

      syncWebsocketBalances (bals) {
        const self = this;
        bals.forEach((bal) => {
            const { a: asset, cw: free, wb: total} = bal;
            const locked = Number(total) - Number(free);
            if (!self.balances) {
                self.balances = {};
            }
            self.balances[asset] = new Balance(asset, free, locked)
        })
      }

      async syncWebsocketOrders (order) {
        try {
            const {s: symbolId} = order;
            const asset = symbolId.split('USDT')[0];
            const symbol = asset + '/' + 'USDT';
            if (!this.orders) {
                this.orders = {};
            }
            const fetchedOrders = await this.exchange.fetchOpenOrders(symbol);
            const symbolOrders = fetchedOrders.map((order) => {
                return new Order({
                    ...order,
                    time: order.timestamp
                })
            })
            this.orders[symbol] =  symbolOrders;
            
        } catch (error) {
            this.logger.info(`Binance Futures: Failed to sync websocket orders (${error.message})`)
        }
      }

      async syncWebsocketPositions () {
          try {
            const self = this;
            this.positions = {};
            const response = await this.exchange.fapiPrivateGetPositionRisk();
            const mappedPositions = response.map((pos) => {
                const { symbol: symbolId, positionAmt: positionAmount} = pos;
                const asset = symbolId.split('USDT')[0];
                const sym = asset + '/' + 'USDT';
                return new Position({
                    symbol: sym,
                    positionAmount,
                    ...pos
                })
            })
            mappedPositions.forEach((pos) => {
                const { symbol } = pos;
                if (self.positions[symbol] && Array.isArray(self.positions[symbol])) {
                    self.positions[symbol].push(pos)
                } else {
                    self.positions[symbol] = [pos];
                }
            })
          } catch (error) {
            this.logger.info(`Binance Futures: Failed to sync websocket Positions (${error.message})`)
          }
      }

}
