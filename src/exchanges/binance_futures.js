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

const periodToTimeDiff = require('../utils/periodToTimeDiff');

module.exports = class BinanceFuturesExchange {
    constructor (eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.ccxt = ccxt;
        this.logger = logger;
        this.name = 'binance_futures';
        this.isFutures = true;
        this._enabledSocket = false;
        this.tickers = {};
        this.orderBooks = {};
        this.markPrices = {};
    }

    async init(config) {
        const { apiKey, apiSecret } = config.get('exchange.binance_futures');
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
            await this.exchange.loadMarkets();
        } catch (error) {
            this.logger.warn(`Binance Futures: Unable to load markets: ${error.message}`);
        }

    }

    async enableSocket() {
        try {
            if (!this._enabledSocket) {
                await this.exchange.checkRequiredCredentials();
                await this.initUserWebsocket();
                this._enabledSocket = true;
            }
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
            this.logger.warn(`Binance Futures: Unable to fetch Pair Info [${symbol}] (${error.message})`);
            return undefined;
        }
    }

    async fetchCandles(symbol, period, since, to = new Date()) {
        try {
            let sinceTimestamp = new Date(since).getTime();
            let toTimestamp = new Date(to).getTime();
            let ohlcv = [];
            const timeDifference = periodToTimeDiff(period);
            const exchangeName = this.name;
            while (sinceTimestamp < (toTimestamp - timeDifference) ) {
                const fetchedCandles = await this.exchange.fetchOHLCV(symbol, period, sinceTimestamp);
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
            this.logger.warn(`Binance Futures: Unable to fetch Candles [${symbol}:${period}] (${error.message})`);
            return undefined;
        }
    }

    addCandleEvent (symbol, period) {
        const self = this;
        const candleEventId = symbol + period; ///To prevent duplicate candle event registration
        if (!this._candleEventsList) {
            this._candleEventsList = []
        }
        try {
            if (this._candleEventsList.indexOf(candleEventId) < 0) {
                this._candleEventsList.push(candleEventId);
                const exchangeName = this.name;
                const retouchedSymbol = this.retouchSymbol(symbol);
                const query = retouchedSymbol.toLowerCase() + '@kline_' + period;
                this.exchange.nodeBinanceApi.futuresSubscribe(query, (kline) => {
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
                    self.eventEmitter.emit(`candle_${exchangeName}_${symbol}_${period}`, retouchedCandle);
                });
            }
        } catch (error) {
            this.logger.warn(`Binance Futures: Problem adding candle event [${symbol} - ${period}] (${error.message})`);
        }
    }

    async fetchTicker (symbol) {
        try {
            if (!this.tickers[symbol]) {
                const tickerFromExchange = await this.exchange.fetchTicker(symbol);
                let {
                    bid: bidPrice,
                    ask: askPrice,
                    bidVolume: bidQty,
                    askVolume: askQty,
                    last: lastPrice
                } = tickerFromExchange;

                const ticker = new Ticker({
                    bidPrice: bidPrice ? bidPrice: lastPrice,
                    askPrice: askPrice ? askPrice: lastPrice,
                    bidQty,
                    askQty,
                    lastPrice
                });
                this.tickers[symbol] = ticker;
            }
            return this.tickers[symbol];
        } catch (error) {
            this.logger.warn(`Binance Futures: Unable to fetch Ticker [${symbol}] (${error.message})`);
            return undefined;
        }
    }

    addTickerEvent(symbol) {
        try {
            const self = this;
            const exchangeName = this.name;
            const retouchedSymbol = this.retouchSymbol(symbol);
            this.exchange.nodeBinanceApi.futuresBookTickerStream(retouchedSymbol, (ticker) => {
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
                self.tickers[symbol] = newTicker;
            })
        } catch (error) {
            this.logger.warn(`Binance Futures: Unable to add Ticker Event [${symbol}] (${error.message})`);
        }
    }

    async fetchMarkPrice(symbol) {
        try {
            if (!this.markPrices[symbol]) {
                const retouchedSymbol = this.retouchSymbol(symbol);
                const {markPrice} = await this.exchange.nodeBinanceApi.futuresMarkPrice( retouchedSymbol );
                this.addMarkPriceEvent(symbol);
                this.markPrices[symbol] = markPrice
            }
            return this.markPrices[symbol];
        } catch (error) {
            this.logger.warn(`Binance Futures: Unable to fetch Mark Price [${symbol}] (${error.message})`);
        }
    }

    addMarkPriceEvent(symbol) {
        try {
            const self = this;
            const exchangeName = this.name;
            const retouchedSymbol = this.retouchSymbol(symbol);
            this.exchange.nodeBinanceApi.futuresMarkPriceStream(retouchedSymbol, (stream) => {
                const {markPrice} = stream;
                this.markPrices[symbol] = markPrice;
            });
        } catch (error) {
            this.logger.warn(`Binance Futures: Unable to add Mark Price Event [${symbol}] (${error.message})`);
        }
    }

    async fetchOrderBook (symbol) {
        try {
           if (!this.orderBooks[symbol]) {
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
                this.orderBooks[symbol] = new OrderBook(bids, asks);
           }
           return this.orderBooks[symbol];
        } catch (error) {
            this.logger.warn(`Binance Futures: Unable to fetch order book [${symbol}] (${error.message})`);
            return undefined
        }
    }
    

    addOrderBookEvent(symbol) {
        try {
            const self = this;
            const exchangeName = this.name;
            const retouchedSymbol = this.retouchSymbol(symbol);
            const query = retouchedSymbol.toLowerCase() + '@depth@500ms';
            this.exchange.nodeBinanceApi.futuresSubscribe(query, (depth) => {
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
                this.orderBooks[symbol] = newOrderBook;
            })
        } catch (error) {
            this.logger.error(`Binance Futures: Unable to add order book event [${symbol}] (${error.message})`);
        }
    }

    async fetchBalance(asset) {
        try {
            if (!this.balances) {
                const fetchedBalances = (await this.exchange.fetchBalance()).info.assets;
                this.balances = {}; //To trigger the balance Websocket event
                fetchedBalances.forEach(bal => {
                    const { asset, maxWithdrawAmount: free, initialMargin: locked } = bal;
                    this.balances[asset] = new Balance(asset, free, locked);
                });
                return this.balances[asset];
            }
            return this.balances[asset];
        } catch (error) {
            this.logger.error(`Binance Futures: Unable to fetch Balance [${asset}] (${error.message})`);
            return undefined;
        }
    }

    async changeLeverage(symbol, leverage) {
        try {
            const retouchedSymbol = this.retouchSymbol(symbol);
            const leverageNumber = Number(leverage);
            const res = await this.exchange.fapiPrivate_post_leverage( {
                symbol: retouchedSymbol,
                leverage: leverageNumber
            });
            if (!this._leverage) {
                this._leverage = {};
            }
            this._leverage[symbol] = leverage;
            return res;
        } catch (error) {
            this.logger.error(`Binance Futures: Unable to change leverage [${symbol}:${leverage}] (${error.message})`);
        }
    }

    getLeverage(symbol) {
        try {
            if (this._leverage && this._leverage[symbol]) return this._leverage[symbol];
            return undefined;
        } catch (error) {
            this.logger.error(`Binance Futures: Unable to fetch leverage [${symbol}] (${error.message})`);
            return undefined;
        }
    }


    async createMarketOrder(symbol, side, amount) {
        try {
            const order = await this.exchange.createOrder(symbol, 'market', side, amount);
            return order;
        } catch (error) {
            this.logger.info(`Binance Futures: Unable to create Market Order [${symbol}:${side}:${amount}] (${error.message})`);
            return undefined;
        }
    }

    async createLimitOrder(symbol, side, amount, price) {
        try {
            const order = await this.exchange.createOrder(symbol, 'limit', side, amount, price);
            return order;
        } catch (error) {
            this.logger.info(`Binance Futures: Unable to create Limit Order [${symbol}:${side}:${amount}:${price}] (${error.message})`);
            return;
        }
    }

    async createOrder (symbol, type, side, amount, price, params) {
        try {
            const order = await this.exchange.createOrder(symbol, type, side, amount, price, params);
            return order;
        } catch (error) {
            this.logger.info(`Binance Futures: Unable to create Custom (${type}) Order [${symbol}:${side}:${amount}:${price}] (${error.message})`);
            return;
        }
    }
    async fetchActiveOrders(symbol) {
        try {
            if (!this.openOrders || (this.openOrders && !this.openOrders[symbol])) {
                this.openOrders = {};
                const fetchedOrders = await this.exchange.fetchOpenOrders(symbol);
                const symbolOrders = fetchedOrders.map((order) => {
                    const stopPrice = order.info.stopPrice;
                    return new Order({
                        ...order,
                        stopPrice,
                        time: order.timestamp
                    })
                })
                this.openOrders[symbol] =  symbolOrders;
                return symbolOrders;
            }
            return this.openOrders[symbol];
            
        } catch (error) {
            this.logger.info(`Binance Futures: Failed to fetch active orders [${symbol}] (${error.message})`);
            return undefined;
        }
    }

    async fetchClosedOrders(symbol) {
        try {
            if (!this.closedOrders || (this.closedOrders && !this.closedOrders[symbol])) {
                this.closedOrders = {};
                const fetchedOrders = await this.exchange.fetchClosedOrders(symbol);
                const symbolOrders = fetchedOrders.map((order) => {
                    return new Order({
                        ...order,
                        time: order.timestamp
                    })
                })
                this.closedOrders[symbol] =  symbolOrders;
                return symbolOrders;
            }
            return this.closedOrders[symbol];
            
        } catch (error) {
            this.logger.info(`Binance Futures: Failed to fetch Closed orders [${symbol}] (${error.message})`);
            return undefined;
        }
    }

    async cancelActiveOrder(orderId, symbol) {
        try {
            return await this.exchange.cancelOrder(orderId, symbol)
        } catch (error) {
            this.logger.info(`Binance Futures: Failed to Cancel Active Order [${symbol}:${orderId}] (${error.message})`);
            return undefined;
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
            this.logger.info(`Binance Futures: Failed to Cancel Active Orders [${symbol}] (${error.message})`);
            return undefined
        }
    }

    async fetchPositions(symbol) {
        try {
            if (!this.positions) {
                await this.syncWebsocketPositions();
            }
            return this.positions[symbol] || [];
        } catch (e) {
            this.logger.error(`Binance Futures: error getting positions:${e.message}`);
            return undefined;
        }
    }

    async closePositions (symbol) {
        try {
            //const order = await exchange.createOrder(symbol, 'limit', side, amount, price)
        } catch (error) {
            this.logger.info(`Binance Futures: Failed to close Positions (${error.message})`);
            return undefined;
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
                // await self.syncWebsocketOrders(order); //Added Throttler
                self.websocketQuickOrderUpdate(order);
                self.throttle('syncwebsocket_orders_key', 'syncWebsocketOrders', order, 4000);
            }

            if (message.e && message.e.toUpperCase() === 'ACCOUNT_UPDATE') {
                const {B: balances, P: positions} = message.a;
                self.syncWebsocketBalances(balances);
                self.websocketQuickPositionsUpdate(positions);
                self.throttle('syncwebsocket_position_key', 'syncWebsocketPositions', null, 2000);
                // await self.syncWebsocketPositions(); // Added throttler
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
        }, 1000 * 60 * 10);
    
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
            if (!this.balances) {
                this.balances = {};
            }
            this.balances[asset] = new Balance(asset, free, locked);
        });
      }

      async syncWebsocketOrders (order) {
        try {
            const {s: symbolId} = order;
            const asset = symbolId.split('USDT')[0];
            const symbol = asset + '/' + 'USDT';
            if (!this.openOrders) {
                this.openOrders = {};
            }
            if (!this.closedOrders) {
                this.closedOrders = {};
            }
            const fetchedOpenOrders = await this.exchange.fetchOpenOrders(symbol);
            const fetchedClosedOrders = await this.exchange.fetchClosedOrders(symbol);
            const symbolOpenOrders = fetchedOpenOrders.map((order) => {
                const stopPrice = order.info.stopPrice;
                return new Order({
                    ...order,
                    stopPrice,
                    time: order.timestamp
                })
            });
            const symbolClosedOrders = fetchedClosedOrders.map((order) => {
                const stopPrice = order.info.stopPrice;
                return new Order({
                    ...order,
                    stopPrice,
                    time: order.timestamp
                })
            });
            this.closedOrders[symbol] = symbolClosedOrders;
            this.openOrders[symbol] =  symbolOpenOrders;
        } catch (error) {
            this.logger.info(`Binance Futures: Failed to sync websocket orders (${error.message})`)
        }
      }

      async syncWebsocketPositions () {
          try {
            const self = this;
            this.positions = {};
            const response = await this.exchange.fapiPrivateGetPositionRisk();
            const filteredPositions = response.filter((position) => {
                const {positionAmt, entryPrice} = position;
                if (parseFloat(positionAmt) === 0) return false;
                if (parseFloat(entryPrice) === 0) return false;
                return true;
            })
            const mappedPositions = filteredPositions.map((pos) => {
                const { symbol: symbolId, positionAmt: positionAmount, entryPrice, liquidationPrice} = pos;
                const asset = symbolId.split('USDT')[0];
                const sym = asset + '/' + 'USDT';
                let positionSide = parseFloat(entryPrice) < parseFloat(liquidationPrice) ? 'SHORT' :'LONG';
                return new Position({
                    ...pos,
                    symbol: sym,
                    positionAmount,
                    positionSide
                });
            });

            mappedPositions.forEach((pos) => {
                const { symbol } = pos;
                if (this.positions[symbol] && Array.isArray(this.positions[symbol])) {
                    this.positions[symbol].push(pos)
                } else {
                    this.positions[symbol] = [pos];
                }
            });
          } catch (error) {
            this.logger.info(`Binance Futures: Failed to sync websocket Positions (${error.message})`);
          }
      }

        websocketQuickPositionsUpdate(positions) {
            const filteredPositions = positions.filter((position) => {
                const {pa: positionAmount, ep: entryPrice} = position;
                if (parseFloat(positionAmount) === 0) return false;
                if (parseFloat(entryPrice) === 0) return false;
                return true;
            });
            this.positions = {}
            filteredPositions.forEach((position) => {
                const {pa: positionAmount, ep: entryPrice, up: unRealizedProfit, s: exchangeSymbol} = position;
                let positionSide = parseFloat(positionAmount) > 0 ? 'LONG' : 'SHORT';
                const asset = exchangeSymbol.split('USDT')[0];
                const symbol = asset + '/' + 'USDT';
                const leverage = this.getLeverage(symbol);
                const newPositionUpdate = new Position({symbol, positionAmount, entryPrice, unRealizedProfit, positionSide, leverage})
                if (!this.positions[symbol]) {
                    this.positions[symbol] = [newPositionUpdate]
                } else if (this.positions[symbol] && Array.isArray(this.positions[symbol])) {
                    this.positions[symbol].push(newPositionUpdate);
                }
            });
        }

        websocketQuickOrderUpdate(order) {
            const stillOpen = ['NEW', 'PARTIALLY_FILLED'];
            const nowClosed = ['FILLED'];

            const {s: exchangeSymbol, } = order;
            const side = order.S.toLowerCase();
            const time = parseInt(order.T);
            const id = String(order.i);
            const price = parseFloat(order.p);
            const status = stillOpen.indexOf(order.X) > -1 ? 'open': 'closed';
            const type = order.o.toLowerCase();
            const amount = parseFloat(order.q);
            const filled = parseFloat(order.z)
            const remaining = amount - filled;
            const asset = exchangeSymbol.split('USDT')[0];
            const symbol = asset + '/' + 'USDT';
            const stopPrice = Number(order.sp);

            if (!this.openOrders) {
                this.openOrders = {};
            }

            if (!this.closedOrders) {
                this.closedOrders = {};
            }

            const updatedOrder = new Order({
                side, time, id, type, price, status, symbol, amount, filled, remaining, stopPrice
            });

            //Remove a open order by id
            function openOrdersRemoveById (self, symbol, id) {
                if (self.openOrders[symbol] && Array.isArray(self.openOrders[symbol])) {
                    self.openOrders[symbol] = self.openOrders[symbol].filter(order => order.id != id);
                }
            }

            // For Open Orders
            if (stillOpen.indexOf(order.X) > -1 ) {
                if (this.openOrders[symbol] && Array.isArray(this.openOrders[symbol])) {
                    openOrdersRemoveById(this, symbol, id);
                    this.openOrders[symbol].push(updatedOrder);
                }  else {
                    this.openOrders[symbol] = [updatedOrder];
                }
            }

            // For Incomplete or Canceled Order
            if (order.X === 'CANCELED' || order.X === 'EXPIRED') {
                openOrdersRemoveById(this, symbol, id);
            }

            //For closed order
            const stillAllowed = (order.X === 'CANCELED' || order.X === 'EXPIRED') && (filled > 0);
            if (nowClosed.indexOf(order.X) > -1 || stillAllowed) {
                openOrdersRemoveById(this, symbol, id)
                if (this.closedOrders[symbol] && Array.isArray(this.closedOrders[symbol])) {
                    this.closedOrders[symbol].push(updatedOrder);
                } else {
                    this.closedOrders[symbol] = [updatedOrder];
                }
            }
        }

        throttle(key, func, parameter = null, timeout = 1000) {
            if (!this.throttleTasks) {
                this.throttleTasks = {};
            }
        
            if (key in this.throttleTasks) {
            this.logger.debug(`Throttler clear existing event: ${key} - ${timeout}ms`);
        
            clearTimeout(this.throttleTasks[key]);
            delete this.throttleTasks[key];
            }
        
            const me = this;
            this.throttleTasks[key] = setTimeout(async () => {
            delete me.throttleTasks[key];
            await me[func](parameter);
            }, timeout);
        }

}
