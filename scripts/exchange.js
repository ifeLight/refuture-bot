const config = require('config')
const eventEmitter = require('../src/events/EventEmitter');
const logger = require('../src/utils/logger');

const ExchangeManager = require('../src/modules/managers/ExchangeManager')
const ExchangePair = require('../src/modules/pair/ExchangePair');


const exchangeManager = new ExchangeManager(eventEmitter, logger);

const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);

exchangePair.init('binance_futures', 'YFI/USDT');

(async ()=> {
    try {
        await exchangePair.setup();
        console.log(await exchangePair.getActiveOrders())
 
    } catch (error) {
        console.error(error);
    }
    
})()