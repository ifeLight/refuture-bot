const CandleModel = require('../../models/Candle');
const Candle = require('../../classes/Candle');

const periodToTimeDiff = require('../../utils/periodToTimeDiff');

module.exports = class CandlesRepository {
    constructor(eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this._eventListenerIds = [];
    }

    createEvent(exchange, symbol, period) {
        const self  = this;
        const {name: exchangeName} = exchange;
        const candleEventName = `candle_${exchangeName}_${symbol}_${period}`;
        if (this._eventListenerIds.indexOf(candleEventName) < 0) {
            exchange.addCandleEvent(symbol, period);
            this._eventListenerIds.push(candleEventName);
            this.eventEmitter.on(candleEventName, async (candle) => {
                try {
                    await CandleModel.addCandle(candle);
                } catch (error) {
                    self.logger.info(`Candles Repository: Error adding Candle (${error.message})`)
                }
            })
        }
    }

    async fetchCandlesByTimeDifference({exchange, symbol, period, startTime, endTime}) {
        try {
            const {name: exchangeName} = exchange;
            this.createEvent(exchange, symbol, period);
            const fromDatabase = await CandleModel.fetchCandles({period, exchangeName, symbol, from: startTime, to: endTime});
            const timeDifference = periodToTimeDiff(period);
            const startTimeTimestamp = new Date(startTime).getTime();
            const endTimeTimestamp = new Date(endTime).getTime();
            const numberOfCandlesNeeded = Math.abs(endTimeTimestamp - startTimeTimestamp) / timeDifference;
            if ((numberOfCandlesNeeded ) >= fromDatabase.length) {
                const fromExchange = await exchange.fetchCandles(symbol, period, startTime, endTime);
                const storeToDatabase = await CandleModel.addCandles(fromExchange);
            } else {
                return fromDatabase;
            }
        return CandleModel.fetchCandles({period, exchangeName, symbol, from: startTime, to: endTime});
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByTimeDifference): Error Fetching Candles [${exchange.name}: ${symbol}] (${error.message})`);
            return undefined;
        }
    }

    async fetchCandlesByNumberFromNow({exchange, symbol, period, length}) {
        try {
            const {name: exchangeName} = exchange;
            this.createEvent(exchange, symbol, period);
            const fromDatabase = await CandleModel.fetchCandles({period, exchangeName, symbol, number: length});
            if (fromDatabase.length < length) {
                const timeDifference = periodToTimeDiff(period);
                const startTime = new Date(Date.now() - (timeDifference * length));
                const fromExchange = await exchange.fetchCandles(symbol, period, startTime);
                const storeToDatabase = await CandleModel.addCandles(fromExchange);
            } else {
                return fromDatabase;
            }
            return CandleModel.fetchCandles({period, exchangeName, symbol, number: length});
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByNumberFromNow): Error Fetching Candles [${exchange.name}: ${symbol}] (${error.message})`);
        }
    }
}