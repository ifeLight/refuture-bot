const defer = require('config/defer').deferConfig;
const dotenv = require('dotenv');

dotenv.config()

const {

} = process.env;

module.exports = {
    exchange: {
        binance: {
            apiKey: '',
            apiSecret: ''
        },
        binance_futures: {
            apiKey: '',
            apiSecret: ''
        }
    },
    db: {
        host: "localhost",
        port: 21017,
        username: "",
        password: "",
        dbname: "tradecharm",
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