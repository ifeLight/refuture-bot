const CandleModel = require('../../models/Candle');
const Candle = require('../../classes/Candle');

const periodToTimeDiff = require('../../utils/periodToTimeDiff');

module.exports = class CandlesRepository {
    constructor(eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this.eventListenerIds = [];
    }

    init(exchange, symbol, period) {
        this.exchange = exchange;
        this.period = period;
        this.symbol = symbol;
        this.exchangeName = this.exchange.name;
        this.exchange.addCandleEvent(symbol, period);
        const candleEventName = `candle_${this.exchangeName}_${symbol}_${period}`;

        if (this.eventListenerIds.indexOf(candleEventName) < 0) {
            this.eventEmitter.on(candleEventName, async function (candle) {
                try {
                    await CandleModel.addCandle(candle)
                } catch (error) {
                    this.logger.info(`Candles Repository: Error adding Candle (${error.message})`)
                }
            })
        }
    }

    async fetchCandlesByTimeDifference(startTime, endTime) {
        try {
            const { period, symbol } = this;
            const exchangeName = this.exchange.name;
            const fromDatabase = await CandleModel.fetchCandleByTimeDifference(period, exchangeName, symbol, startTime, endTime);
            const timeDifference = periodToTimeDiff(period);
            const startTimeTimestamp = new Date(startTime).getTime();
            const endTimeTimestamp = new Date(endTime).getTime();
            const numberOfCandlesNeeded = Math.abs(endTimeTimestamp - startTimeTimestamp) / timeDifference;
            if ((numberOfCandlesNeeded ) >= fromDatabase.length) {
                const fromExchange = await this.exchange.fetchCandles(symbol, period, startTime, endTime);
                const storeToDatabase = await CandleModel.addCandles(fromExchange);
            } else {
                return fromDatabase;
            }
        return CandleModel.fetchCandleByTimeDifference(period, exchangeName, symbol, startTime, endTime);
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByTimeDifference): Error Fetchig Candles [${this.exchange.name}: ${this.symbol}] (${error.message})`);
            return undefined;
        }
    }

    async fetchCandlesByNumberFromNow(numberOfCandlesFromNow) {
        try {
            const { period, symbol } = this;
            const exchangeName = this.exchange.name;
            const fromDatabase = await CandleModel.fetchCandlesByNumber(period, exchangeName, symbol, numberOfCandlesFromNow);
            if (fromDatabase.length < numberOfCandlesFromNow) {
                const laterTime = new Date(Date.now() - (timeDifference * numberOfCandlesFromNow));
                const fromExchange = await this.exchange.fetchCandles(symbol, period, startTime);
                const storeToDatabase = await CandleModel.addCandles(fromExchange);
            } else {
                return fromDatabase;
            }
            return CandleModel.fetchCandlesByNumber(period, exchangeName, symbol, numberOfCandlesFromNow);
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByNumberFromNow): Error Fetchig Candles [${this.exchange.name}: ${this.symbol}] (${error.message})`);
        }
    }
}