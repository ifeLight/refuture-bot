const IndicatorManager = require('./IndicatorManager');
const PolicyManger = require('./PolicyManager');
const InsuranceManager = require('./InsuranceManager');
const SafetyManager = require('./SafetyManager');
const WatchdogManager = require('./WatchdogManager');
const ExchangeManager = require('./ExchangeManager');
const OrderExecutor = require('./manager-helpers/OrderExecutor')

const ExchangePair = require('../pair/ExchangePair')

const CandlesRepository = require('../repository/CandlesRepository')

class StrategyManager {
    constructor ({eventEmitter, logger, notifier}) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this.notifier = notifier;
        this._list = [];
    }

    async init() {
        const {
            logger,
            eventEmitter,
            notifier
        } = this;

        this.orderExecutor = new OrderExecutor({logger, eventEmitter, notifier});

        const exchangeManager = new ExchangeManager(eventEmitter, logger);
        const candlesRepository = new CandlesRepository(eventEmitter, logger);

        this.indicatorManager = new IndicatorManager({candlesRepository, logger, eventEmitter, exchangeManager});
        this.safetyManager = new SafetyManager({logger, eventEmitter, exchangeManager, candlesRepository});

        // NOTE - on progress
        // this.policyManger = new PolicyManger();
        // this.insuranceManager = new InsuranceManager();
        // this.watchdogManager = new WatchdogManager();

        // NOTE Remember to set up ExchngePair for each Symbol
    }

    add(strat) {
        // const eachExchangeObjectConfigSample = {
        //     symbol: 'BTC/USDT',
        //     exchange: 'binance_futures',
        //     trade: {
        //         amount: 0.01,
        //         currency_amount: 15,
        //         usd_amount: 15,
        //         order_type: 'limit' //'limit' or'market'
        //     },
        //     strategies: {
        //         indicators: [
        //             {
        //                 name: '',
        //                 options: {}
        //             }
        //         ],
        //         safeties: [
        //             {}
        //         ],
        //         insurances: [
        //             {}
        //         ]
        //     }
        // }

        const { symbol, exchange, trade, strategies} = strat;
        if (!symbol || !exchange || !trade || !strategies) {
            throw new Error('Strategy Manager: A compulsory field is missing for a strategy');
        }

        const { policies, insurances, safeties, indicators } = strategies;
        if (!indicators) {
            throw new Error('Strategy Manager: An Indicator is needed to be provided')
        }

        const isExist = this._list.some((strat) => strat.symbol === symbol && strat.exchange === exchange);
        if (isExist) throw Error(`Strategy Manager: Duplicate strategy for a pair [${exchange}:${symbol}]`);
        this._list.push(strat);
    }

    getList() {
        return this._list;
    }

    async setExchangePair(strat) {
        const { exchange: exchangeName, symbol} = strat;
        const { eventEmitter, logger, exchangeManager } = this;
        const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);
        exchangePair.init(exchangeName, symbol)
        await exchangePair.setup();
        return exchangePair;
    }

    async runStrategies() {}

    async runStrategy(exchangePair){
        
    }

}