const config = require('config')
const eventEmitter = require('../src/events/EventEmitter');
const logger = require('../src/utils/logger');

const ExchangeManager = require('../src/modules/managers/ExchangeManager')
const ExchangePair = require('../src/modules/pair/ExchangePair');


const exchangeManager = new ExchangeManager(eventEmitter, logger);

const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);

exchangePair.init('binance_futures', 'BTC/USDT');

(async ()=> {
    try {
        await exchangePair.setup();
        console.log(await exchangePair.createOrder('STOP', 'sell', 0.003, 9500, {
            'stopPrice': 9600
        }))
 
    } catch (error) {
        console.error(error);
    }
    
})()