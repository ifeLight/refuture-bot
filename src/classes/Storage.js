const OptionsStorage = require('../providers/Options');

module.exports = class Storage {
    constructor(exchangeName, symbol) {
        this.exchangeName = exchangeName;
        this.symbol = symbol;
    }

    async get(key) {
        try {
            return OptionsStorage.get(this.personaliseKey(key));
        } catch (error) {
            throw new Error(`Storage:[${this.symbol}:${this.exchangeName}:${key}]: Unable to fetch storage data(${error.message})`)
            return undefined;
        }
    }

    async set(key, value) {
        try {
            await OptionsStorage.set(this.personaliseKey(key), value)
        } catch (error) {
            throw new Error(`Storage:[${this.symbol}:${this.exchangeName}:${key}]: Unable to store  data(${error.message})`)
        }
    }

    async delete(key) {
        try {
            await OptionsStorage.delete(this.personaliseKey(key))
        } catch (error) {
            throw new Error(`Storage:[${this.symbol}:${this.exchangeName}:${key}]: Unable to delete storage data(${error.message})`)
        }
    }

    personaliseKey(key) {
        return `${this.exchangeName}-${this.symbol}-${key}`;
    }
}