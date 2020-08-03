const config = require('config')
const eventEmitter = require('../src/events/EventEmitter');
const logger = require('../src/utils/logger');

const CandlesRepository = require('../src/modules/repository/CandlesRepository');
const IndicatorManager  = require('../src/modules/managers/IndicatorManager');
const SafetyManager  = require('../src/modules/managers/SafetyManager');

const OrderExecutor = require('../src/modules/managers/manager-helpers/OrderExecutor');

const ExchangeManager = require('../src/modules/managers/ExchangeManager')
const ExchangePair = require('../src/modules/pair/ExchangePair');

const SignalResult = require('../src/classes/SignalResult')

const exchangeManager = new ExchangeManager(eventEmitter, logger);
const candlesRepository = new CandlesRepository(eventEmitter, logger);

const indicatorManager = new IndicatorManager({candlesRepository, logger, eventEmitter, exchangeManager});
const safetyManager = new SafetyManager({logger, eventEmitter, exchangeManager, candlesRepository})
const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);

const notifier = undefined;

const orderExecutor = new OrderExecutor({logger, eventEmitter, notifier});

exchangePair.init('binance_futures', 'BTC/USDT');

const strat = {
    symbol : "BTC/USDT",
    exchange: "binance_futures",
    trade: {
        amount: 0.001,
        order_type: "limit",
        leverage: 2
    },
    strategies: {
        indicators: [
            {
                name: "bollingerSimple",
                options: {
                    period: "5m",
                    length: 14,
                    stdDev: 2
                }
            }
        ],
        safeties: [
            {
                name: "simpleBollinger",
                options: {
                    period: "5m",
                    length: 14,
                    stdDev: 2
                }
            }
        ]
    }
};

(async ()=> {
    try {
        await exchangePair.setup();
        // const lst = indicatorManager.getList();
        // const res = await indicatorManager.run('bollingerSimple', exchangePair, {
        //     period: '5m',
        //     length: 14,
        //     stdDev: 2
        // })


        // console.log(lst);
        // console.log(res);


        // const signalResult = SignalResult.createSignal('close');
        // console.info(await orderExecutor.execute(signalResult, exchangePair, strat));

        // console.info(await exchangePair.exchange.exchange);
        
    } catch (error) {
        console.error(error);
    }
    
})()

// console.log('great');
// const moment = require('moment')

// console.info( moment.utc('2002-12-09'))