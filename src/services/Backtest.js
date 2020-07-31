const clc = require('cli-color');

const IndicatorManager = require('../modules/managers/IndicatorManager');
const CandlesRepository = require('../modules/repository/CandlesRepository');
const ExchangeManager = require('../modules/managers/ExchangeManager');
const ExchangePair = require('../backtest/ExchangePair');

const logger = require('../backtest/utils/logger');
const eventEmitter = require('../backtest/utils/eventEmitter');
const drawChart = require('../backtest/utils/drawChart');
const Backtester = require('../backtest/Backtest');
const timeCalc = require('../backtest/utils/timeCalc');

const periodToTimeDiff = require('../utils/periodToTimeDiff');

class Backtest {
    constructor(parameters) {
        this.parameters = parameters,
        this.logger = logger,
        this.eventEmitter = eventEmitter;
        this.exchangeManager = new ExchangeManager(eventEmitter, logger);
        this.exchangePair = new ExchangePair(eventEmitter, logger, this.exchangeManager);
        this.candlesRepository = new CandlesRepository(eventEmitter, logger, true);
        const {
            candlesRepository,
            exchangeManager
        } = this;
        this.indicatorManager = new IndicatorManager({
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
            fee
        } = this.parameters;
        let indicatorName, indicatorOptions;
        let tradingFee;
        let timingStart;

        const log = this.log;
        this.state = {};

        // Checking Indicator
        log(clc.white.bgBlack('Checking Indicator.....'))
        if (typeof indicator === 'string') {
            indicatorName = indicator;
        } if (typeof indicator === 'object' && indicator.name) {
            indicatorName = indicator.name;
            indicatorOptions = indicator.options;
        } else {
            throw new Error('Invalid indicator')
        }
        this.indicatorName = indicatorName;
        log(clc.greenBright('indicator OK'))

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

        //Backfilling
        const indicatorDefaultOptions = (this.indicatorManager.find(indicatorName)).getOptions();
        if (indicatorDefaultOptions && indicatorDefaultOptions.period) {
            await this.backfill({period: indicatorDefaultOptions.period , exchangeName, exchange, symbol, startDate, endDate});
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
            parentObject: this
        });
        timingStart = Date.now();
        const result = await backtester.start();
        log(clc.greenBright(`Backtester - DONE (${timeCalc(timingStart)}secs)`));
        drawChart(result);
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

    
}

module.exports =  Backtest;