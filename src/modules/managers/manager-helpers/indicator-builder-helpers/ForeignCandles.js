const logger = require('../../../../utils/logger');
const eventEmitter = require('../../../../events/EventEmitter')

module.exports = class Candles {
    constructor(exchange, symbol) {
        this.exchange= exchange;
        this.symbol = symbol;
    }

    getName() {
        return 'foreign-candles';
    }
    
    init(options) {
        this.period = options.period
    }

    async build() {
        try {
            
        } catch (error) {
            this.logger(`${this.getName().toUpperCase()} Builder: indicator builder Failed [${this.symbol}] (${error.message})`)
        }
    }
}