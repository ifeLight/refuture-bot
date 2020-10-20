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
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    PORT,
    EXECUTION_TYPE
} = process.env;

module.exports = {
    notify: {
        telegram_key: TELEGRAM_BOT_TOKEN,
        telegram_chat_id: TELEGRAM_CHAT_ID
    },
    app : {
        port: PORT || 8100,
    },
    strategy: {
        counterPeriodLog: 500,
        executionType: EXECUTION_TYPE || 'parallel' // Could be 'parallel' || 'series'
    },
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
        poolSize: 10,
        host: "localhost",
        port: 27017,
        username: "",
        password: "",
        dbname: process.env.DB_NAME || "refuture",
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