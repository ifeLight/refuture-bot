const logger = require('../../../../utils/logger');
const eventEmitter = require('../../../../events/EventEmitter')

module.exports = class Candles {
    constructor({exchange, symbol}) {
        this.exchange= exchange;
        this.symbol = symbol;
    }

    getName() {
        return 'tulind';
    }
    
    init(options) {
        this.period = options.period
    }

    async build() {
        try {
            // TODO Will be fixed later
            throw new Error('Still on progress');
        } catch (error) {
            this.logger(`Tulind Builder: indicator builder Failed [${this.symbol}] (${error.message})`)
        }
    }
}