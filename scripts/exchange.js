const config = require('config')
const eventEmitter = require('../src/events/EventEmitter');
const logger = require('../src/utils/logger');
const resSupLinesGen = require('../src/utils/supportResistanceGen')

const ExchangeManager = require('../src/modules/managers/ExchangeManager')
const ExchangePair = require('../src/modules/pair/ExchangePair');
const CandlesRepository  = require('../src/modules/repository/CandlesRepository')


const exchangeManager = new ExchangeManager(eventEmitter, logger);
const candlesRepository = new CandlesRepository(eventEmitter, logger, false);

const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);

exchangePair.init('binance_futures', 'YFI/USDT');

(async ()=> {
    try {
        await exchangeManager.setup()
        await exchangePair.setup();
        const exchange = exchangeManager.find('binance_futures')
        // console.log(await exchangePair.getActiveOrders())
        const candles = await candlesRepository.fetchCandlesByNumberFromNow({exchange, symbol: 'BTC/USDT',period: '5m', length: 200});
        const lines = resSupLinesGen({candles, candleDepth: 5, minMatch: 1})
        console.log(lines)

        // Shut down
        process.exit()
 
    } catch (error) {
        console.error(error);
        process.exit(1)
    }
    
})()