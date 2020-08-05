const technicalIndicators = require('technicalindicators');

module.exports = class Candles {
    constructor(exchange, symbol) {
        this.exchange= exchange;
        this.symbol = symbol;
    }

    getName() {
        return 'technical-indicators';
    }
    
    init(options) {
        this.name = options.name;
        this.period = options.length;
    }

    async build() {
        try {
            // TODO This Library is still complex to use
            throw new Error('Still working on this Indicator Builder')
        } catch (error) {
            this.logger(`Technical Indicator Builder: indicator builder Failed [${this.symbol}] (${error.message})`);
            return undefined;
        }
    }
}