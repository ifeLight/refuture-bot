const CandleModel = require('../../models/Candle');
const CandleMem = require('../../models/CandleMem')
const Candle = require('../../classes/Candle');

const periodToTimeDiff = require('../../utils/periodToTimeDiff');

module.exports = class CandlesRepository {
    constructor(eventEmitter, logger, backtest = false, useMemory = false) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this._eventListenerIds = [];
        this._backtest = backtest;
        this.CandleModel = useMemory === true ? CandleMem: CandleModel;
    }

    setDefaultToDate(time = Date.now()) {
        this._defaultToDate = time;
    }

    setBacktest(status) {
        this._backtest = status;
    }

    useMemory (use = true){
        if (use === true) {
            this.CandleModel = CandleMem;
        } else if (use === false) {
            this.CandleModel = CandleModel;
        }
    }

    createEvent(exchange, symbol, period) {
        const self  = this;
        const {name: exchangeName} = exchange;
        const candleEventName = `candle_${exchangeName}_${symbol}_${period}`;
        if (this._eventListenerIds.indexOf(candleEventName) < 0 && !this._backtest) {
            exchange.addCandleEvent(symbol, period);
            this._eventListenerIds.push(candleEventName);
            this.eventEmitter.on(candleEventName, async (candle) => {
                try {
                    await CandleModel.addCandle(candle); //Event Candle addition not Permitted to Mem
                } catch (error) {
                    self.logger.info(`Candles Repository: Error adding Candle (${error.message})`)
                }
            })
        }
    }

    async  storeMongoDB (data, quick = false) {
        if (!quick){
            await CandleModel.addCandles(data);
        } else {
            CandleModel.addCandles(data)
            .then((value) => {})
            .catch((error) => {
                console.error(error)
            })
        }
    }

    async storeToDatabase(data, quick = false) {
        if (this.CandleModel === CandleModel) {
            console.log('storage 1')
            await this.storeMongoDB(data, quick);
        } else {
            console.log('Storage 2')
            await this.CandleModel.addCandles(data);
            await this.storeMongoDB(data, true);
        }
    }

    async fetchCandlesByTimeDifference({exchange, symbol, period, startTime, endTime, quick=false}) {
        try {
            console.time('CandeFetch')
            const {name: exchangeName} = exchange;
            this.createEvent(exchange, symbol, period);
            const timeDifference = periodToTimeDiff(period);
            const startTimeTimestamp = new Date(startTime).getTime();
            const endTimeTimestamp = new Date(endTime).getTime();
            const numberOfCandlesNeeded = Math.abs(endTimeTimestamp - startTimeTimestamp) / timeDifference;
            console.time('From Database');
            const fromDatabase = await this.CandleModel.fetchCandles({period, number: numberOfCandlesNeeded, exchangeName, symbol, from: startTime, to: endTime});
            console.log(`From database length: ${fromDatabase.length}`)
            console.log(`Required Length: ${numberOfCandlesNeeded}`)
            console.timeEnd('From Database');
            if (numberOfCandlesNeeded > fromDatabase.length) {
                console.time('From Exchange');
                const fromExchange = await exchange.fetchCandles(symbol, period, startTime, endTime);
                console.log(`Gotten from exchange: ${fromExchange.length}`)
                console.timeEnd('From Exchange');
                console.time('Store Database');
                await this.storeToDatabase(fromExchange, quick);
                console.timeEnd('Store Database');
                if (quick === true) {
                    return fromExchange;
                }
            } else {
                return fromDatabase;
            }
            console.time('Refetch Database');
            const refetched = this.CandleModel.fetchCandles({period, number: numberOfCandlesNeeded,  exchangeName, symbol, from: startTime, to: endTime});
            console.timeEnd('Refetch Database');
            return refetched;
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByTimeDifference): Error Fetching Candles [${exchange.name}: ${symbol}] (${error.message})`);
            return undefined;
        }
    }

    async fetchCandlesByNumberFromNow({exchange, symbol, period, length}) {
        try {
            const {name: exchangeName} = exchange;
            const autoConfig = {};
            if (this._defaultToDate) {
                autoConfig.to = this._defaultToDate; 
            }
            this.createEvent(exchange, symbol, period);
            const fromDatabase = await this.CandleModel.fetchCandles({period, exchangeName, symbol, number: length, ...autoConfig});
            if (fromDatabase.length < length) {
                const timeDifference = periodToTimeDiff(period);
                const startTime = new Date(Date.now() - (timeDifference * length));
                const fromExchange = await exchange.fetchCandles(symbol, period, startTime);
                await this.storeToDatabase(fromExchange);
            } else {
                return fromDatabase;
            }
            return this.CandleModel.fetchCandles({period, exchangeName, symbol, number: length});
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByNumberFromNow): Error Fetching Candles [${exchange.name}: ${symbol}] (${error.message})`);
        }
    }
}
