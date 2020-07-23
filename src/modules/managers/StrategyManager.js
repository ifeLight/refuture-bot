const pForever = require('p-forever');

const IndicatorManager = require('./IndicatorManager');
const PolicyManger = require('./PolicyManager');
const InsuranceManager = require('./InsuranceManager');
const SafetyManager = require('./SafetyManager');
const WatchdogManager = require('./WatchdogManager');
const ExchangeManager = require('./ExchangeManager');
const OrderExecutor = require('./manager-helpers/OrderExecutor')

const ExchangePair = require('../pair/ExchangePair');

const CandlesRepository = require('../repository/CandlesRepository');

const SignalResult = require('../../classes/SignalResult');

class StrategyManager {
    constructor ({eventEmitter, logger, notifier}) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this.notifier = notifier;
        this._list = [];
        this._exchangePairs = [];
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
        //         order_type: 'limit' //'limit' or'market',
        //         leverage: 5,
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

    getExchangePair (exchangeName, symbol) {
        return this._exchangePairs[`${exchangeName}:${symbol}`];
    }

    async setExchangePair(strat) {
        const { exchange: exchangeName, symbol} = strat;
        const { leverage } = trade;
        const { eventEmitter, logger, exchangeManager } = this;
        const isExist = this.getExchangePair(exchangeName, symbol)
        if (isExist) return isExist;
        const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);
        exchangePair.init(exchangeName, symbol);
        await exchangePair.setup();
        if (leverage) {
            await exchangePair.setLeverage(leverage)
        }
        this._exchangePairs[`${exchangeName}:${symbol}`];
        return exchangePair;
    }

    async runInidicatorsStrategyTick(strat){
        const { symbol, exchange: exchangeName, trade, strategies} = strat;
        const { policies, insurances, safeties, indicators } = strategies;
        let exchangePair;
        const indicatorsResults = [];
        if (this.getExchangePair(exchangeName, symbol)) {
            exchangePair = this.getExchangePair(exchangeName, symbol)
        } else {
            const setExchangePair = await this.setExchangePair(strat);
            exchangePair = setExchangePair;
        }
        if (indicators && Array.isArray(indicators) && indicators.length > 0) {
            for (indicator of indicators) {
                let indicatorResult;
                if (typeof indicator === 'string') {
                    indicatorsResults.push(await this.indicatorManager.run(indicator, exchangePair, null));
                } else if (typeof indicator === 'object') {
                    const { name, options} = indicator;
                    indicatorsResults.push(await this.indicatorManager.run(name, exchangePair, options));
                }
            }
        }
        return indicatorsResults;
    }

    async runSafetiesStrategyUnit(strat){
        const { symbol, exchange: exchangeName, strategies} = strat;
        const { safeties } = strategies;
        let exchangePair;
        if (this.getExchangePair(exchangeName, symbol)) {
            exchangePair = this.getExchangePair(exchangeName, symbol)
        } else {
            const setExchangePair = await this.setExchangePair(strat);
            exchangePair = setExchangePair;
        }
        if (safeties && Array.isArray(safeties) && safeties.length > 0) {
            for (safety of safeties) {
                let safetyResult;
                if (typeof safety === 'string') {
                    safetyResult = await this.safetyManager.run(safety, exchangePair, null);
                } else if (typeof safety === 'object') {
                    const { name, options} = safety;
                    safetyResult = await this.safetyManager.run(name, exchangePair, options);
                }
                await this.orderExecutor.execute(safetyResult, exchangePair, strat);
            }
        }
    }

    indicatorSignalsResolver(signalResults) {
        if (!signalResults ) {
            return SignalResult.createEmptySignal();
        }
        const longSignals = signalResults.filter((signalResult) => typeof signalResult === 'object' && signalResult === 'long');
        const shortSignals = signalResults.filter((signalResult) => typeof signalResult === 'object' &&  signalResult === 'short');
        const closeSignals = signalResults.filter((signalResult) => typeof signalResult === 'object' &&  signalResult === 'close');
        const isAllsignalEqual = longSignals.length === shortSignals.length  && longSignals.length === closeSignals.length;
        const isOppositeSignalEqual = longSignals.length === shortSignals.length;

        if (isAllsignalEqual || isOppositeSignalEqual) {
            return SignalResult.createEmptySignal();
        }
        if (longSignals.length > shortSignals.length && longSignals.length > closeSignals.length) {
            return longSignals[0];
        }

        if (shortSignals.length > longSignals.length && shortSignals.length > closeSignals.length) {
            return shortSignals[0];
        }

        if (closeSignals.length > longSignals.length && closeSignals.length > shortSignals.length) {
            return closeSignals[0];
        }
        return SignalResult.createEmptySignal();
    } 

    async runIndicatorStrategyUnit(strat) {
        const { symbol, exchange: exchangeName} = strat;
        let exchangePair;
        if (this.getExchangePair(exchangeName, symbol)) {
            exchangePair = this.getExchangePair(exchangeName, symbol)
        } else {
            const setExchangePair = await this.setExchangePair(strat);
            exchangePair = setExchangePair;
        }
        const signalResults = await this.runInidicatorsStrategyTick(strat);
        const signalResult = this.indicatorSignalsResolver(signalResults);
        await this.orderExecutor.execute(signalResult, exchangePair, strat);
    }

    runStrategies() {
        const list = this.getList();
        const self = this;
        list.forEach(strat => {
            const { symbol, exchange: exchangeName} = strat;
            pForever(async (i) => {
                try {
                    await this.runIndicatorStrategyUnit(strat);
                } catch (error) {
                    self.logger.warn(`Indicator Loop: {Loop: ${i}} Error in the loop [${exchangeName}:${symbol}] (${error.message})`)
                }
            });

            pForever(async (i) => {
                try {
                    await this.runSafetiesStrategyUnit(strat);
                } catch (error) {
                    self.logger.warn(`Safety Loop: {Loop: ${i}} Error in the loop [${exchangeName}:${symbol}] (${error.message})`)
                }
            });
        });

    }

}

module.exports = StrategyManager;