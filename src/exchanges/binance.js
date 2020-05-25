const ccxt = require ('ccxt'); //The bulk exchange library
const Logger = require('../utils/Logger')

module.exports = class BinanceExchange {
    constructor () {
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
            Logger.errorLogger(error);
        }
    }

    async fetchCandles(symbol, period, since, to = new Date()) {
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
    }
}