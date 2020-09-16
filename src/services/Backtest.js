const clc = require('cli-color');

const IndicatorManager = require('../modules/managers/IndicatorManager');
const SafetyManager = require('../modules/managers/SafetyManager');
const ExchangePair = require('../backtest/ExchangePair');

const logger = require('../backtest/utils/logger');
const eventEmitter = require('../backtest/utils/eventEmitter');
const drawChart = require('../backtest/utils/drawChart');
const Backtester = require('../backtest/Backtest');
const timeCalc = require('../backtest/utils/timeCalc');

const periodToTimeDiff = require('../utils/periodToTimeDiff');

const { candlesRepository, exchangeManager } = require('./preService')

class Backtest {
    constructor(parameters) {
        this.parameters = parameters,
        this.logger = logger,
        this.eventEmitter = eventEmitter;
        this.exchangeManager = exchangeManager;
        candlesRepository.setBacktest(true)
        this.exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);
        this.candlesRepository = candlesRepository;
        this.indicatorManager = new IndicatorManager({
            candlesRepository,
            logger,
            eventEmitter,
            exchangeManager
        });
        this.safetymanager = new SafetyManager({
            candlesRepository,
            logger,
            eventEmitter,
            exchangeManager
        })
    }

    log(data) {
        process.stdout.write(data + '\n');
    }

    async start() {
        const {
            indicator,
            startDate,
            endDate,
            exchange: exchangeName,
            symbol,
            period,
            orderType,
            leverage,
            stopLoss,
            takeProfit,
            amount,
            noInterruption,
            fee,
            useDefaultSafety,
            safeties,
            backfillPeriods
        } = this.parameters;

        let indicatorName, indicatorOptions;
        let tradingFee;
        let timingStart;

        const log = this.log;
        this.state = {};
        this.safeties = []

        // Checking Indicator
        log(clc.white.bgBlack('Checking Indicator.....'))
        if (typeof indicator === 'string') {
            indicatorName = indicator;
        } else if (typeof indicator === 'object' && indicator.name) {
            indicatorName = indicator.name;
            indicatorOptions = indicator.options;
        } else {
            throw new Error('Invalid indicator')
        }
        this.indicatorName = indicatorName;
        console.log(this.indicatorName)
        log(clc.greenBright('indicator OK'));

        // Checking Safeties
        log(clc.white.bgBlack('Checking Safeties.....'))
        this.setupSafeties(safeties);
        log(clc.greenBright('Safeties OK'));


        // Init Exchange Pair
        try {
            timingStart = Date.now();
            log(clc.white.bgBlack('Setting up the Exchange Pair.....'))
            this.exchangePair.init(exchangeName, symbol);
            await this.exchangePair.setup();
            await this.exchangePair.setLeverage(leverage);
            const pairInfo = this.exchangePair.info;
            const { maker, taker } = pairInfo.fees
            tradingFee = parseFloat(fee) || Math.max(parseFloat(maker), parseFloat(taker)) * 100;
            log(clc.greenBright(`Exchange Pair Setup - DONE (${timeCalc(timingStart)}secs)`));
        } catch (error) {
           throw error; 
        }

        const exchange = this.exchangeManager.find(exchangeName);

        // Fetching Candles
        const startTime = new Date(startDate);
        const endTime = new Date(endDate);

        log(clc.white.bgBlack('Fetching Candles.....'))
        log(clc.white.bgBlack(`From ${startDate}.... to ${endDate} `));
        timingStart = Date.now();
        const fetchedCandles = await this.candlesRepository.fetchCandlesByTimeDifference({
            exchange,
            symbol,
            period,
            startTime,
            endTime
        });
        
        log(clc.greenBright(`Fetching Candles - DONE (${timeCalc(timingStart)}secs)`));
        log(clc.greenBright(`Candles Fetched: ${fetchedCandles.length} [${exchangeName}:${symbol}:${period}] `));

        // Setting up Indicator Options
        const indicatorDefaultOptions = (this.indicatorManager.find(indicatorName)).getOptions();
        this.indicatorOptions = indicatorOptions || indicatorDefaultOptions;

        //Backfilling
        if (this.indicatorOptions && this.indicatorOptions.period) {
            await this.backfill({period: this.indicatorOptions.period , exchangeName, exchange, symbol, startDate, endDate});
        }

        //Run backfill periods
        if (backfillPeriods) {
            let toBeBackfilledPeriods = []
            if (typeof backfillPeriods === 'string') {
                toBeBackfilledPeriods = backfillPeriods.split(',');
            } else if (Array.isArray(backfillPeriods)) {
                toBeBackfilledPeriods = backfillPeriods
            }
            for (const period of toBeBackfilledPeriods) {
                await this.backfill({period, exchangeName, exchange, symbol, startDate, endDate});
            }
        }

        // Running Backtest
        log(clc.white.bgBlack('Running Backtester Started.....'));
        const backtester = new Backtester({
            candles: fetchedCandles,
            stopLoss,
            takeProfit,
            exchangeFee: tradingFee,
            amount,
            leverage,
            strategy: this.strategy,
            safety: this.safety,
            parentObject: this,
            noInterruption,
            useDefaultSafety: useDefaultSafety ? true : false,
        });
        timingStart = Date.now();
        const result = await backtester.start();
        log(clc.greenBright(`Backtester - DONE (${timeCalc(timingStart)}secs)`));
        drawChart(result);
        candlesRepository.setBacktest(false)
        process.exit();
    }

    async backfill ({period, exchangeName, exchange, symbol, startDate, endDate}) {
        const startTime = new Date((new Date(startDate)).getTime() - (periodToTimeDiff(period) * 220));
        const endTime = new Date(endDate);
        const log = this.log;
        log(clc.white.bgBlack('Backfiling Candles.....'))
        log(clc.white.bgBlack(`From ${startDate}.... to ${endDate} `));
        let timingStart = Date.now();
        const backfilledCandles = await this.candlesRepository.fetchCandlesByTimeDifference({
            exchange,
            symbol,
            period,
            startTime,
            endTime
        });
        
        log(clc.greenBright(`Backfiling Candles - DONE (${timeCalc(timingStart)}secs)`));
        log(clc.greenBright(`Backfiling Candles Fetched: ${backfilledCandles.length} [${exchangeName}:${symbol}:${period}] `));
    }

    async strategy (time, price, self) {
        let timingStart = Date.now();
        self.state.signals = {};
        self.state.lastSignal = null;
        self.state.index = self.state.index  || 0;
        self.state.totalTime = self.state.totalTime || 0;
        const isFutures = self.exchangePair.isFutures();
        const log = self.log;
        if (self.state.index === 0) {
            await self.indicatorManager.runInit(self.indicatorName, self.exchangePair, self.indicatorOptions);
        }
        const probablyTrials = parseInt(this.candles.length * 3);
        self.exchangePair.setLastSignal(self.state.lastSignal);
        self.exchangePair.setMarkPrice(price);
        self.exchangePair.setLastPrice(price);
        self.exchangePair.setTime(time);
        self.candlesRepository.setDefaultToDate(time);
        const signalResult = await self.indicatorManager.run(self.indicatorName, self.exchangePair, self.indicatorOptions);
        if (!signalResult || (signalResult && !signalResult.getSignal())) {
            // Do nothing
        } else if (signalResult.getSignal() && signalResult.getSignal() === 'long') {
            this.openPosition(time, price, 'long');
            self.state.lastSignal = 'long';
         } else if (signalResult.getSignal() && signalResult.getSignal() === 'short') {
            let positionType = isFutures ? 'short' : 'none';
            this.openPosition(time, price, positionType);
            self.state.lastSignal = 'short';
        } else if (signalResult.getSignal() && signalResult.getSignal() === 'close') {
            this.openPosition(time, price, 'none');
            self.state.lastSignal = 'close';
        }

        if (self.state.index !== 0) {
            process.stdout.write(clc.move.up(1));
            process.stdout.write(clc.erase.line);
        } 
        self.state.totalTime = parseInt(self.state.totalTime + parseInt((Date.now() - timingStart)));
        const avgTime = ((self.state.totalTime / 1000 ) / self.state.index).toFixed(2);
        log(clc.blue(`Running Indicator: ${self.state.index}/${probablyTrials} [AvgTime: ${avgTime}secs]`))
        self.state.index++;
    }


    async safety (time, price, self) {
        const safeties = self.safeties;
        for (const safety of safeties) {
            const safetyName = safety.name;
            const safetyOptions = safety.options;

            self.state.index = self.state.index  || 0;
            const isFutures = self.exchangePair.isFutures();
            self.exchangePair.setLastSignal(self.state.lastSignal);
            self.exchangePair.setMarkPrice(price);
            self.exchangePair.setLastPrice(price);
            self.exchangePair.setTime(time);
            self.candlesRepository.setDefaultToDate(time);
            if (this.state.positionType === 'long') {
                self.exchangePair.setPosition(this.state.positionEntry, 'LONG');
            } else if (this.state.positionType === 'short') {
                self.exchangePair.setPosition(this.state.positionEntry, 'SHORT');
            } else {
                self.exchangePair.emptyPositions();
            }

            if (self.state.index === 0) {
                await self.safetymanager.runInit(safetyName, self.exchangePair, safetyOptions);
            }
       
            const signalResult = await self.safetymanager.run(safetyName, self.exchangePair, safetyOptions);
            if (!signalResult || (signalResult && !signalResult.getSignal())) {
                // Do nothing
            } else if (signalResult.getSignal() && signalResult.getSignal() === 'long') {
                this.openPosition(time, price, 'long');
            } else if (signalResult.getSignal() && signalResult.getSignal() === 'short') {
                let positionType = isFutures ? 'short' : 'none';
                this.openPosition(time, price, positionType);
            } else if (signalResult.getSignal() && signalResult.getSignal() === 'close') {
                this.closePosition(time, price, safetyName);
                // console.log('close');
                // console.log('');
            }
        }
    }

    setupSafeties (safeties) {
        if (typeof safeties === 'string') {
            this.safeties.push({
                name: safeties,
                options: null
            });
        } else if (typeof safeties === 'object' && safeties.name) {
            this.safeties.push({
                name: safeties.name,
                options: safety.options,
            })
        } else if (Array.isArray(safeties) && typeof safeties[0] === 'string') {
            for (const safety of safeties) {
                this.safeties.push({
                    name: safety,
                    options: null
                });
            }
        } else if (Array.isArray(safeties) && typeof safeties[0] === 'string' && safeties[0].name) {
            for (const safety of safeties) {
                this.safeties.push({
                    name: safety.name,
                    options: safeties.options
                });
            }
        } else {
            throw new Error('Invalid Safeties')
        }
    }
    
}

module.exports =  Backtest;