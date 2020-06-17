const talib = require('talib')

module.exports = class Candles {
    constructor({candlesRepository, exchange, symbol, logger, eventEmitter}) {
        this.exchange= exchange;
        this.symbol = symbol;
    }

    getName() {
        return 'talib';
    }
    
    init(options) {
        this.period = options.period;
    }

    getFunction(name) {
        const obj = talib.functions.find((func) => {
            return func.name === name;
        })
    }

    async build() {
        try {
            // TODO Will be fixed later
            throw new Error('Still on progress')
            
        } catch (error) {
            this.logger(`Talib Builder: indicator builder Failed [${this.symbol}] (${error.message})`);
            return undefined;
        }
    }
}