const IndicatorManager = require('../modules/managers/IndicatorManager');
const CandlesRepository = require('../modules/repository/CandlesRepository');
const ExchangeManager = require('../modules/managers/ExchangeManager');
const ExchangePair = require('../backtest/ExchangePair');

const logger = require('../backtest/utils/logger');
const eventEmitter = require('../backtest/utils/eventEmitter');

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
            fee
        } = this.parameters;
        let indicatorName, indicatorOptions;
        let tradingFee;

        // Checking Indicator
        if (typeof indicator === 'string') {
            indicatorName = indicator;
        } if (typeof indicator === 'object' && indicator.name) {
            indicatorName = indicator.name;
            indicatorOptions = indicator.options;
        } else {
            throw new Error('Invalid indicator')
        }

        // Init Exchange Pair
        try {
            this.exchangePair.init(exchangeName, symbol);
            await this.exchangePair.setup();
            await this.exchangePair.setLeverage(leverage);
            const pairInfo = this.exchangePair.info;
            const { maker, taker } = pairInfo.fees
            tradingFee = parseFloat(fee) || Math.max(parseFloat(maker), parseFloat(taker));
        } catch (error) {
           throw error; 
        }

        const exchange = this.exchangeManager.find(exchangeName);

        // Fetching Candles
        const startTime = new Date(startDate);
        const endTime = new Date(endDate);
        const fetchedCandles = this.candlesRepository.fetchCandlesByTimeDifference({
            exchange,
            symbol,
            period,
            startTime,
            endTime
        });

        // Mapping candles
        const mappedCandles = fetchedCandles.mapp((candle) => {
            const { time, open, high, close, low, volume } = candle
            return [time, open, high, low, close, volume];
        })

        // Creating signals
        const signals = await this.runIndicator({
            fetchedCandles,
            indicatorName,
            orderType,
            indicatorOptions,
            period
        });

    }

    async runIndicator ({fetchedCandles, indicatorName, orderType, indicatorOptions, period}) {
        let signals = {};
        let lastSignal = null;
        const periodtoTime = periodToTimeDiff(period);
        const candlePointUnitTime = parseInt(periodtoTime / 3);
        const isFutures = this.exchangePair.isFutures();

        // Running Indicator Initial
        await this.indicatorManager.runInit(indicatorName, this.exchangePair, indicatorOptions)

        //Running Indicators For Sinals
        for (const candle of fetchedCandles) {
            const {open, high, low, close, time } = candle;
            const candlePoints = [
                {price: parseFloat(open), time: time },
                {price: parseFloat(high), time: time + (candlePointUnitTime * 1)},
                {price: parseFloat(low), time: time + (candlePointUnitTime * 2)}
            ]

            for (const candlePoint of candlePoints) {
                const { time, price } = candlePoint
                this.exchangePair.setLastSignal(lastSignal);
                this.exchangePair.setMarkPrice(price);
                this.exchangePair.setLastPrice(price);
                this.exchangePair.setTime(time);
                const signalResult = await this.indicatorManager.run(indicatorName, this.exchangePair, indicatorOptions);

                if (!signalResult || (signal && !signalResult.getSignal())) {
                    // Do nothing
                } else if (signalResult.getSignal() && signalResult.getSignal() === 'long') {
                    signals[time] = { positionType: 'long', orderType, price };
                    lastSignal = 'long';
                 } else if (signalResult.getSignal() && signalResult.getSignal() === 'short') {
                        let positionType = isFutures ? 'short' : 'none';
                        signals[time] = { positionType, orderType, price };
                        lastSignal = 'short';
                } else if (signalResult.getSignal() && signalResult.getSignal() === 'close') {
                    signals[time] = { positionType: 'none', orderType, price };
                    lastSignal = 'close';
                }
                
            }
        }
        return signals;
    }
}

module.exports =  Backtest;