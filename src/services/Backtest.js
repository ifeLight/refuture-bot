const clc = require('cli-color');

const IndicatorManager = require('../modules/managers/IndicatorManager');
const SafetyManager = require('../modules/managers/SafetyManager');
const ExchangePair = require('../backtest/ExchangePair');
const CandlesRepository = require('../modules/repository/CandlesRepository')

const logger = require('../backtest/utils/logger');
const eventEmitter = require('../backtest/utils/eventEmitter');
const drawChart = require('../backtest/utils/drawChart');
const Backtester = require('../backtest/Backtest');
const timeCalc = require('../backtest/utils/timeCalc');

const periodToTimeDiff = require('../utils/periodToTimeDiff');

const { exchangeManager } = require('./preService')

class Backtest {
    constructor() {
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.exchangeManager = exchangeManager;
        this.exchangePair = new ExchangePair(eventEmitter, logger, exchangeManager);
        const candlesRepository = new CandlesRepository(eventEmitter, logger, true);
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
        this.toLog = true;
    }

    log(data) {
        if (!this.toLog) return;
        process.stdout.write(data + '\n');
    }

    async start(parameters) {
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
            backfillPeriods,
            backfillSpace = 220,
            toLog = true,
            useMemory
        } = parameters;

        let indicatorName, indicatorOptions;
        let tradingFee;
        let timingStart;

        const log = this.log;
        this.toLog = toLog === undefined ? true: toLog;
        this.state = {};
        this.safeties = [];
        this.backfillSpace = backfillSpace;

        if (!this.exchangeManager.setupDone) {
            this.log(clc.white.bgBlack('setting up Exchange Manager.....'))
            await this.exchangeManager.setup();
            this.log(clc.white.bgBlack('Exchange Manager set up Done'))
        }

        // Let Candles Repository knows its runnind a Backtest
        this.candlesRepository.setBacktest(false);

        //Set Using of Memory
        this.candlesRepository.useMemory(useMemory);

        // Checking Indicator
        this.log(clc.white.bgBlack('Checking Indicator.....'))
        if (typeof indicator === 'string') {
            indicatorName = indicator;
        } else if (typeof indicator === 'object' && indicator.name) {
            indicatorName = indicator.name;
            indicatorOptions = indicator.options;
        } else {
            throw new Error('Invalid indicator')
        }
        this.indicatorName = indicatorName;
        this.log(this.indicatorName)
        this.log(clc.greenBright('indicator OK'));

        // Checking Safeties
        this.log(clc.white.bgBlack('Checking Safeties.....'))
        this.setupSafeties(safeties);
        this.log(clc.greenBright('Safeties OK'));


        // Init Exchange Pair
        try {
            timingStart = Date.now();
            this.log(clc.white.bgBlack('Setting up the Exchange Pair.....'))
            this.exchangePair.init(exchangeName, symbol);
            await this.exchangePair.setup();
            await this.exchangePair.setLeverage(leverage);
            const pairInfo = this.exchangePair.info;
            const { maker, taker } = pairInfo.fees
            tradingFee = parseFloat(fee) || Math.max(parseFloat(maker), parseFloat(taker)) * 100;
            this.log(clc.greenBright(`Exchange Pair Setup - DONE (${timeCalc(timingStart)}secs)`));
        } catch (error) {
           throw error; 
        }

        const exchange = this.exchangeManager.find(exchangeName);

        // Fetching Candles
        const startTime = new Date(startDate);
        const endTime = new Date(endDate);

        this.log(clc.white.bgBlack('Fetching Candles.....'))
        this.log(clc.white.bgBlack(`From ${startDate}.... to ${endDate} `));
        timingStart = Date.now();
        const fetchedCandles = await this.candlesRepository.fetchCandlesByTimeDifference({
            exchange,
            symbol,
            period,
            startTime,
            endTime
        });
        
        this.log(clc.greenBright(`Fetching Candles - DONE (${timeCalc(timingStart)}secs)`));
        this.log(clc.greenBright(`Candles Fetched: ${fetchedCandles.length} [${exchangeName}:${symbol}:${period}] `));

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

        this.log(clc.green.bgBlack(`StopLoss: ${stopLoss} - TakeProfit: ${takeProfit} - Period: ${period}`));

        // Running Backtest
        this.log(clc.white.bgBlack('Running Backtester Started.....'));
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
            timeMetrics: this.performanceUpdate,
            useDefaultSafety: useDefaultSafety ? true : false,
        });
        timingStart = Date.now();
        const result = await backtester.start();
        this.log(clc.greenBright(`Backtester - DONE (${timeCalc(timingStart)}secs)`));
        if (this.toLog) {
            drawChart(result);
        }
        this.candlesRepository.setBacktest(false);
        this.candlesRepository.useMemory(false);

        const { balance } = result;
        
        result.safeties = safeties;
        result.roi = ((parseFloat(balance) - parseFloat(amount)) / parseFloat(amount)) * 100;
        result.indicators = indicator;
        result.symbol = symbol;
        result.exchange = exchangeName;
        result.orderType = orderType;
        result.startDate = new Date(startDate);
        result.endDate = new Date(endDate);
        result.period = period;
        return result;
    }

    async backfill ({period, exchangeName, exchange, symbol, startDate, endDate}) {
        const startTime = new Date((new Date(startDate)).getTime() - (periodToTimeDiff(period) * this.backfillSpace));
        const endTime = new Date(endDate);
        const log = this.log;
        this.log(clc.white.bgBlack('Backfiling Candles.....'))
        this.log(clc.white.bgBlack(`From ${startDate}.... to ${endDate} `));
        let timingStart = Date.now();
        const backfilledCandles = await this.candlesRepository.fetchCandlesByTimeDifference({
            exchange,
            symbol,
            period,
            startTime,
            endTime
        });
        
        this.log(clc.greenBright(`Backfiling Candles - DONE (${timeCalc(timingStart)}secs)`));
        this.log(clc.greenBright(`Backfiling Candles Fetched: ${backfilledCandles.length} [${exchangeName}:${symbol}:${period}] `));
    }

    performanceUpdate(data, self) {
        const {totalLength, averageTime, timeRemaining, index} = data;
        const log = self.log;
        if (index !== 0) {
            if (self.toLog) {
                process.stdout.write(clc.move.up(1));
                process.stdout.write(clc.erase.line);
            }
        } 
        self.log(clc.blue(`Backtest Running: ${index}/${totalLength} periods [AvgTime: ${averageTime}secs] [Time Remaining: ${timeRemaining}mins]`))
    }

    async strategy (time, price, self) {
        self.state.signals = {};
        self.state.lastSignal = null;
        self.state.index = self.state.index  || 0;
        const isFutures = self.exchangePair.isFutures();
        if (self.state.index === 0) {
            await self.indicatorManager.runInit(self.indicatorName, self.exchangePair, self.indicatorOptions);
        }
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
            }
        }
    }

    setupSafeties (safeties) {
        if (typeof safeties === 'string') {
            if (safeties !== "") {
                this.safeties.push({
                    name: safeties,
                    options: null
                });
            }
        } else if (typeof safeties === 'object' && safeties.name) {
            this.safeties.push({
                name: safeties.name,
                options: safeties.options,
            })
        } else if (Array.isArray(safeties) && safeties.length === 0) {
            //Do nothing
        } else if (Array.isArray(safeties) && typeof safeties[0] === 'string') {
            for (const safety of safeties) {
                this.safeties.push({
                    name: safety,
                    options: null
                });
            }
        } else if (Array.isArray(safeties) && typeof safeties[0] === 'object' && safeties[0].name) {
            for (const safety of safeties) {
                this.safeties.push({
                    name: safety.name,
                    options: safety.options
                });
            }
        } else {
            throw new Error('Invalid Safeties')
        }
    }
    
}

module.exports =  Backtest;