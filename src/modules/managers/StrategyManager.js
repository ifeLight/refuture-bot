const config = require('config')
// const cron = require('node-cron');
// // const CronJob = require('cron').CronJob;

// // const schedule = require('node-schedule');

const IndicatorManager = require('./IndicatorManager');
const PolicyManger = require('./PolicyManager');
const InsuranceManager = require('./InsuranceManager');
const SafetyManager = require('./SafetyManager');
const WatchdogManager = require('./WatchdogManager');
const OrderExecutor = require('./manager-helpers/OrderExecutor')

const ExchangePair = require('../pair/ExchangePair');

const SignalResult = require('../../classes/SignalResult');
const QueueLock = require("../../classes/QueueLock")
const IntervalEvent = require('../../classes/IntervalEvent')

class StrategyManager {
    constructor ({eventEmitter, logger, notifier, exchangeManager, candlesRepository }) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this.notifier = notifier;
        this._list = [];
        this._exchangePairs = [];
        this.exchangeManager = exchangeManager;
        this.candlesRepository = candlesRepository;
        this.indicatorJobs = [];
        this.queueLock = new QueueLock();
        this.intervalEvent = new IntervalEvent(this.eventEmitter);
    }

    async init() {
        const {
            logger,
            eventEmitter,
            notifier,
            exchangeManager,
            candlesRepository
        } = this;

        this.orderExecutor = new OrderExecutor({logger, eventEmitter, notifier});
        this.indicatorManager = new IndicatorManager({candlesRepository, logger, eventEmitter, exchangeManager});
        this.safetyManager = new SafetyManager({logger, eventEmitter, exchangeManager, candlesRepository});
        this.insuranceManager = new InsuranceManager({logger, eventEmitter, exchangeManager, candlesRepository});

        // NOTE - on progress
        // this.policyManger = new PolicyManger();
        // this.watchdogManager = new WatchdogManager();

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

    async createExchangePair(strat) {
        const { exchange: exchangeName, symbol, trade} = strat;
        const { leverage } = trade;
        const { eventEmitter, logger, exchangeManager } = this;
        const isExist = this.getExchangePair(exchangeName, symbol)
        if (isExist) return isExist;
        const exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);
        exchangePair.init(exchangeName, symbol);
        await exchangePair.setup();
        if (leverage) {
            await exchangePair.setLeverage(parseInt(leverage))
        }
        this._exchangePairs[`${exchangeName}:${symbol}`] = exchangePair;
        return exchangePair;
    }

    async runIndicatorsInitials(strat) {
       return (await this.runInidicatorsStrategyTick(strat, true))
    }

    async runSafetiesInitials(strat) {
        return (await this.runSafetiesStrategyUnit(strat, true));
    }

    async runInidicatorsStrategyTick (strat, init=false){
        const self  = this;
        const { symbol, exchange: exchangeName, trade, strategies} = strat;
        const { policies, insurances, safeties, indicators } = strategies;
        let exchangePair;
        const indicatorsResults = [];
        if (self.getExchangePair(exchangeName, symbol)) {
            exchangePair = self.getExchangePair(exchangeName, symbol)
        } else {
            const createExchangePair = await self.createExchangePair(strat);
            exchangePair = createExchangePair;
        }
        if (indicators && Array.isArray(indicators) && indicators.length > 0) {
            for (let indicator of indicators) {
                let indicatorResult;
                if (typeof indicator === 'string') {
                    indicatorsResults.push(await self.indicatorManager.run(indicator, exchangePair, null, init));
                } else if (typeof indicator === 'object') {
                    const { name, options} = indicator;
                    indicatorsResults.push(await self.indicatorManager.run(name, exchangePair, options, init));
                }
            }
        }
        return indicatorsResults;
    }

    async runSafetiesStrategyUnit(strat, init=false){
        const { symbol, exchange: exchangeName, strategies} = strat;
        const { safeties } = strategies;
        let exchangePair;
        if (this.getExchangePair(exchangeName, symbol)) {
            exchangePair = this.getExchangePair(exchangeName, symbol)
        } else {
            const createdExchangePair = await this.createExchangePair(strat);
            exchangePair = createdExchangePair;
        }
        if (safeties && Array.isArray(safeties) && safeties.length > 0) {
            for (let safety of safeties) {
                let safetyResult;
                if (typeof safety === 'string') {
                    safetyResult = await this.safetyManager.run(safety, exchangePair, null, init, strat);
                } else if (typeof safety === 'object') {
                    const { name, options} = safety;
                    safetyResult = await this.safetyManager.run(name, exchangePair, options, init, strat);
                }
                await this.orderExecutor.execute(safetyResult, exchangePair, strat);
            }
        }
    }

    indicatorSignalsResolver(signalResults) {
        if (!signalResults || (signalResults && signalResults.length < 1) ) {
            return SignalResult.createEmptySignal();
        }
        const longSignals = signalResults.filter((signalResult) => typeof signalResult === 'object' && signalResult.getSignal() === 'long');
        const shortSignals = signalResults.filter((signalResult) => typeof signalResult === 'object' &&  signalResult.getSignal() === 'short');
        const closeSignals = signalResults.filter((signalResult) => typeof signalResult === 'object' &&  signalResult.getSignal() === 'close');
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
        const { symbol, exchange: exchangeName, strategies} = strat;
        const {insurances} = strategies;
        let exchangePair;
        if (this.getExchangePair(exchangeName, symbol)) {
            exchangePair = this.getExchangePair(exchangeName, symbol)
        } else {
            const createdExchangePair = await this.createExchangePair(strat);
            exchangePair = createdExchangePair;
        }
        const signalResults = await this.runInidicatorsStrategyTick(strat);
        let signalResult = this.indicatorSignalsResolver(signalResults);
        signalResult = await this.insuranceManager.runAllInsurances(strat, insurances, exchangePair, signalResult)
        await this.orderExecutor.execute(signalResult, exchangePair, strat);
    }

    counter(symbol, exchangeName, interval = 10) {
        if (!this._counterObj) {
            this._counterObj = {}
        }
        const key = `${symbol}_${exchangeName}`;
        if (!this._counterObj[key]){
            this._counterObj[key] = 0;
        }
        if (this._counterObj[key] % interval === 0) {
            console.log(`Strategy Running [${key}]: ${this._counterObj[key]} - Interval (${interval})`)
        }
        this._counterObj[key]++;
    }

    indicatorCounter(symbol, exchangeName) {
        if (!this._indCounterObj) {
            this._indCounterObj = {}
        }
        const key = `${symbol}_${exchangeName}`;
        if (!this._indCounterObj[key]){
            this._indCounterObj[key] = 0;
        }
        console.log(`Indicator Running [${key}]: ${this._indCounterObj[key]} - ${new Date().toLocaleString()}` )
        this._indCounterObj[key]++;
    }

    runIndicatorFromeEvent(strat) {
        const { symbol, exchange: exchangeName} = strat;
        this.queueLock.close(symbol, exchangeName);
        this.runIndicatorStrategyUnit(strat)
        .then(() => {
            this.queueLock.open(symbol, exchangeName);
            this.indicatorCounter(symbol, exchangeName);
        })
        .catch((error) => {
            this.queueLock.open(symbol, exchangeName);
            this.logger.error(`Indicator Forever Interval: Error in Running this Interval [${exchangeName}:${symbol}] (${error.message})`);
        })
    }

    async runStrategies() {
        const counterPeriodLog = config.get('strategy.counterPeriodLog');
        const executionType = config.get('strategy.executionType');
        const list = this.getList();
        const self = this;
        const lastRunNumbers = {}

        const delay = (time) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve()
                }, time);
            });
        };

        // Run Initials
        for (const strat of list) {
            const { symbol, exchange: exchangeName} = strat;
            try {
                await this.runIndicatorsInitials(strat);
                await this.runSafetiesInitials(strat);
            } catch (error) {
                self.logger.error(`Initial Forever Loop: Error in the loop Initalization [${exchangeName}:${symbol}] (${error.message})`)
            }
        }

        // list.forEach((strat) => {
        //     const id = this.indicatorJobs.length;
        //     const { symbol, exchange: exchangeName, tick = 1} = strat;
        //     const key = `${symbol}_${exchangeName}_` + Math.floor(Math.random() * 100).toString();
        //     // Add Cron Job
        //     // const crontTime = `0 */${tick} * * * *`;
        //     this.intervalEvent.add(key, tick);
        //     // The Event Listener for Indicators
        //     this.eventEmitter.on(key, () => {
        //         this.queueLock.close(symbol, exchangeName);
        //         this.runIndicatorStrategyUnit(strat)
        //         .then(() => {
        //             this.queueLock.open(symbol, exchangeName);
        //             this.indicatorCounter(symbol, exchangeName);
        //         })
        //         .catch((error) => {
        //             this.queueLock.open(symbol, exchangeName);
        //             this.logger.error(`Indicator Forever Interval: Error in Running this Interval [${exchangeName}:${symbol}] (${error.message})`);
        //         })
        //     });
            
        // });

        async function runStrat(strat)  {
            const { symbol, exchange: exchangeName, tick = 5} = strat;
            const key = `${symbol}_${exchangeName}_${tick}`;
            try {
                const date = new Date();
                // const seconds = date.getSeconds();
                const minutes = date.getMinutes();
                let presentRunNumber; 
                for (let i = minutes ; i >= -60; i--) {
                    if ( Math.abs(i % tick) === 0) {
                        presentRunNumber = Math.abs(i);
                        break;
                    }  
                }
                let probableNextNumber = presentRunNumber + tick;
                let nextRunNumber = probableNextNumber < 60 ? probableNextNumber : probableNextNumber - 60;
                let lastRunNumber = lastRunNumbers[key];
                if (lastRunNumber === undefined || lastRunNumber === null) {
                    lastRunNumbers[key] = presentRunNumber;
                    lastRunNumber = presentRunNumber;
                }
                if (presentRunNumber !== lastRunNumber) {
                    await self.runIndicatorStrategyUnit(strat);
                    lastRunNumbers[key] = presentRunNumber;
                    self.indicatorCounter(symbol, exchangeName);
                } else {
                    await delay(2000);
                }
                await self.runSafetiesStrategyUnit(strat);
                self.counter(symbol, exchangeName, counterPeriodLog);
            } catch (error) {
                self.logger.warn(`Forever  safety Loop: Error in the loop [${exchangeName}:${symbol}] (${error.message})`);
            }
        }

        function parallelExec ()  {
            return new Promise((resolve, reject) => {
                try {
                    list.forEach(async (strat) => {
                       while (true) {
                        await runStrat(strat);
                       }
                    })
                } catch (error) {
                    reject(error.message);
                }
            });
        }

        async function seriesExec() {
            while (true) {
                for (const strat of list) {
                    await runStrat(strat);
                }
            }
        }

        if (executionType == 'parallel') {
            await parallelExec();
        } else {
            await seriesExec();
        }
        console.log('DONE...')
    }

}

module.exports = StrategyManager;