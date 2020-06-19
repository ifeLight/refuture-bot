const OptionsStorage = require('../../../../providers/Options');

module.exports = class Storage {
    constructor(exchangeName, symbol, logger) {
        this.exchangeName = exchangeName;
        this.symbol = symbol;
        this.logger = logger;
    }

    async get(key) {
        try {
            return OptionsStorage.get(personalizeKey(key));
        } catch (error) {
            this.logger.error(`Indicator Period Storage:[${this.symbol}:${this.exchangeName}:${key}]: Unable to fetch data(${error.message})`);
            return undefined;
        }
    }

    async set(key, value) {
        try {
            await OptionsStorage.set(personalizeKey(key), value)
        } catch (error) {
            this.logger.error(`Indicator Period Storage:[${this.symbol}:${this.exchangeName}:${key}]: Unable to Store data(${error.message})`)

        }
    }

    personalizeKey(key) {
        return `${this.exchangeName}-${this.symbol}-${key}`;
    }
}