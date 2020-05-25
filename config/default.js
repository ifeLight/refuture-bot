const defer = require('config/defer').deferConfig;
const dotenv = require('dotenv');

dotenv.config()

const {
    BINANCE_API_KEY,
    BINANCE_API_SECRET,
    BINANCE_FUTURES_API_KEY,
    BINANCE_FUTURES_API_SECRET,
    OKEX_API_KEY,
    OKEX_API_SECRET,
} = process.env;

module.exports = {
    exchange: {
        binance: {
            apiKey: BINANCE_API_KEY,
            apiSecret: BINANCE_API_SECRET
        },
        binance_futures: {
            apiKey: BINANCE_FUTURES_API_KEY,
            apiSecret: BINANCE_FUTURES_API_SECRET
        },
        okex: {
            apiKey: OKEX_API_KEY,
            apiSecret: OKEX_API_SECRET
        }
    },
    db: {
        host: "localhost",
        port: 21017,
        username: "",
        password: "",
        dbname: "refuture",
        optionsCollection: process.env.OPTIONS_COLLECTION_NAME || 'options',
        uri: defer(function () {
            const { host, port, username, password, dbname} = this.db;
            if (process.env.MOGNGO_DB_URI) {
                return process.env.MOGNGO_DB_URI;
            }
            const authSource = this.db.username && this.db.password ? '?authSource=admin' : '';
            return `mongodb://${username && password ? username + ':' + password + '@ ': ''}${host}${port? ':' + port : ''}/${dbname}${authSource}`;
        })
    },
}