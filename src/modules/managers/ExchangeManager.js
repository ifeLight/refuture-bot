const path = require('path');
const requireAll = require('require-all');
const config =  require('config');

class ExchangeManager {
    constructor(eventEmitter, logger) {
        const exchangedir = path.join(__dirname, '../../', 'exchanges');
        const exchangeObject = requireAll(exchangedir);
        const exchanges = {};
        Object.keys(exchangeObject).forEach((key) => {
            try {
                let theExchange = new exchangeObject[key](eventEmitter, logger);
                theExchange.init(config)
                let theExchangeName = theExchange.name;
                exchanges[theExchangeName] = theExchange;
            } catch (error) {
                logger.error(`Exchange Manager: Error loading exchanges (${error.message})`);
            }
        })
        this.exchanges = exchanges;
    }

    find(exchangeName) {
        return this.exchanges[exchangeName];
    }

    getList(){
        return this.exchanges; // It returns an Object
    }
}

module.exports = ExchangeManager;