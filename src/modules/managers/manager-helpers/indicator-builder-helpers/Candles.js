const logger = require('../../../../utils/logger');
const eventEmitter = require('../../../../events/EventEmitter');

module.exports = class Candles {
    constructor(candlesRepositiory, exchange, symbol) {
        this.candlesRepositiory = candlesRepositiory;
        this.exchange = exchange;
        this.symbol = symbol;
    }

    getName() {
        return 'candles';
    }
    
    init(options) {
        this.period = options.period
        this.candlesLength = options.length || 200;

    }

    async build() {
        try {
            this.candlesRepositiory.init(this.exchange, this.symbol, this.period);
            const result = await this.candlesRepositiory.fetchCandlesByNumberFromNow(parseInt(this.candlesLength))
            console.log(result);
            return result;
        } catch (error) {
            logger.info(`${this.getName()} Builder: indicator builder Failed [${this.symbol}] (${error.message})`);
            return undefined;
        }
    }
}