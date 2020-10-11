const { AsyncNedb } = require('nedb-async')

class MemStorage {
    constructor (exchangeName, symbol) {
        this.db = new AsyncNedb();
        this.exchangeName = exchangeName;
        this.symbol = symbol;
    }

    personaliseKey(key) {
        return `${this.exchangeName}-${this.symbol}-${key}`;
    }

    async get (key) {
        const personalisedKey = this.personaliseKey(key)
        const res = await this.db.asyncFindOne({key: personalisedKey});
        return (res && res.value ? res.value : undefined);
    }

    async set (key, value) {
        const personalisedKey = this.personaliseKey(key);
        const res = await this.db.asyncUpdate({key: personalisedKey}, {value}, {upsert: true, multi: true});
        return Boolean(res);
    }

    async delete (key) {
        const personalisedKey = this.personaliseKey(key);
        const res = await this.db.asyncRemove({key: personalisedKey}, { multi: true});
        return true;
    }
}

module.exports = MemStorage;