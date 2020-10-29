const config = require('config')
const eventEmitter = require('../src/events/EventEmitter');
const logger = require('../src/utils/logger');

const CandlesRepository = require('../src/modules/repository/CandlesRepository');
const IndicatorManager  = require('../src/modules/managers/IndicatorManager');
const SafetyManager  = require('../src/modules/managers/SafetyManager');

const OrderExecutor = require('../src/modules/managers/manager-helpers/OrderExecutor');

const ExchangeManager = require('../src/modules/managers/ExchangeManager')
const ExchangePair = require('../src/modules/pair/ExchangePair');

const exchangeManager = new ExchangeManager(eventEmitter, logger);
const candlesRepository = new CandlesRepository(eventEmitter, logger);

const indicatorManager = new IndicatorManager({candlesRepository, logger, eventEmitter, exchangeManager});
const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);


exchangePair.init('binance_futures', 'BTC/USDT');


(async ()=> {
    try {
        await exchangePair.setup();
        for (const item of Array.from(Array(10).keys())) {
            const res = await indicatorManager.run('double-bollinger', exchangePair, {
                period: '5m',
                largePeriod: '30m',
                smallLength: 20,
                largeLength: 20,
                smallDeviation: 2,
                largeDeviation: 2,
            });
    
            console.log(res);
        }

        
    } catch (error) {
        console.error(error);
    }
    
})()

// console.log('great');
// const moment = require('moment')

// console.info( moment.utc('2002-12-09'))