const config = require('config')
const eventEmitter = require('../src/events/EventEmitter');
const logger = require('../src/utils/logger');

const CandlesRepository = require('../src/modules/repository/CandlesRepository');

const ExchangeManager = require('../src/modules/managers/ExchangeManager')
const ExchangePair = require('../src/modules/pair/ExchangePair');

const exchangeManager = new ExchangeManager(eventEmitter, logger);
const candlesRepository = new CandlesRepository(eventEmitter, logger);
const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);

const TulindIndicator = require('../src/modules/managers/manager-helpers/indicator-builder-helpers/Tulind')
const PivotsIndicator = require('../src/modules/managers/manager-helpers/indicator-builder-helpers/Pivots')

const symbol = 'BTC/USDT';
const exchange = exchangeManager.find('binance');

const pivotsIndicator = new PivotsIndicator({
    candlesRepository,
    exchange,
    symbol,
    logger,
    eventEmitter
})

const tulindIndicator = new TulindIndicator({
    candlesRepository,
    exchange,
    symbol,
    logger,
    eventEmitter
});
 

(async ()=> {
    try {
        

        // tulindIndicator.init({
        //     name: 'sma',
        //     length: 50,
        //     options: {
        //         period: 20
        //     }
        // })

        pivotsIndicator.init({
            length: 100,
            period: '15m',
            depth: 5
        })
        console.log(await pivotsIndicator.build());
        
    } catch (error) {
        console.error(error);
    }
    
})()
