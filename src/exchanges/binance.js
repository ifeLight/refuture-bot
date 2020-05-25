const ccxt = require ('ccxt'); //The bulk exchange library
const Logger = require('../utils/Logger')

module.exports = class BinanceExchange {
    constructor () {
        // this.eventEmitter = EventEmmitter;
        this.ccxt = ccxt;
        this.name = 'binance';
    }

    getName () {
        return this.name;
    }

    setName (name) {
        this.name = name;
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
}