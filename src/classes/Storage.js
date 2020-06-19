const OptionsStorage = require('../providers/Options');

module.exports = class Storage {
    constructor(exchangeName, symbol) {
        this.exchangeName = exchangeName;
        this.symbol = symbol;
    }

    async get(key) {
        try {
            return OptionsStorage.get(personalizeKey(key));
        } catch (error) {
            throw new Error(`Storage:[${this.symbol}:${this.exchangeName}:${key}]: Unable to fetch storage data(${error.message})`)
            return undefined;
        }
    }

    async set(key, value) {
        try {
            await OptionsStorage.set(personalizeKey(key), value)
        } catch (error) {
            throw new Error(`Storage:[${this.symbol}:${this.exchangeName}:${key}]: Unable to fetch storage data(${error.message})`)
        }
    }

    personalizeKey(key) {
        return `${this.exchangeName}-${this.symbol}-${key}`;
    }
}