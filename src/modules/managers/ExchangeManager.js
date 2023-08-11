const path = require('path');
const requireAll = require('require-all');
const config =  require('config');

class ExchangeManager {
    constructor(eventEmitter, logger) {
        const exchangedir = path.join(__dirname, '../../', 'exchanges');
        this.exchangeObject = requireAll(exchangedir);
        this.exchanges = {};
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.setupDone = false;
    }

    async setup() {
        const exchangeObject = this.exchangeObject;
        const exchangeKeys = Object.keys(exchangeObject);
        const {logger, eventEmitter} = this;
        for (const key of exchangeKeys) {
            try {
                let theExchange = new exchangeObject[key](eventEmitter, logger);
                await theExchange.init(config)
                let theExchangeName = theExchange.name;
                this.exchanges[theExchangeName] = theExchange;
            } catch (error) {
                logger.error(`Exchange Manager: Error loading exchanges (${error.message})`);
            }
        }
        this.setupDone = true;
    }

    find(exchangeName) {
        return this.exchanges[exchangeName];
    }

    getList(){
        return this.exchanges; // It returns an Object
    }
}

module.exports = ExchangeManager;