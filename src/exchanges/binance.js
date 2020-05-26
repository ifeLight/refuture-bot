const ccxt = require ('ccxt'); //The bulk exchange library
const logger = require('../utils/logger')
const BinanceApiNode = require('binance-api-node');

module.exports = class BinanceExchange {
    constructor (eventEmitter) {
        // this.eventEmitter = EventEmmitter;
        this.ccxt = ccxt;
        this.name = 'binance';
    }

    get name () {
        return this.name;
    }


    init(config) {
        const { apiKey, apiSecret } = config.get('exchange.binance');
        this.exchange = new ccxt.binance({
            apiKey,
            apiSecret,
            timeout: 30000,
            enableRateLimit: true
        })
        this.exchange.binanceApiNode = BinanceApiNode({
            apiKey, apiSecret
        })

    }

    async fetchMarket(symbol) {
        try {
            if (this.markets) {
                const market = this.markets.find((market) => market.symbol == symbol);
                return market;
            } 
        this.markets = await this.exchange.fetchMarkets();
        return this.markets.find((market) => market.symbol == symbol);
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
            const retouchedSymbol = symbol.search('/') < 0 ? symbol : symbol.split('/')[0] + symbol.split('/')[1]; //Retouched for binance api node module
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
}