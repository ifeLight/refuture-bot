const CandleModel = require('../../models/Candle');
const CandleMem = require('../../models/CandleMem')
const Candle = require('../../classes/Candle');
const config = require('config');

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
                    const {time, period} = candle;
                    const presentTime = Date.now();
                    const periodicTime = periodToTimeDiff(period);
                    const fiveSeconds = 5 * 1000;
                    const candleTimeDiff = presentTime - time;
                    const periodCandleDiff = periodicTime - candleTimeDiff;

                    const check1 = (periodCandleDiff > -fiveSeconds) && (periodCandleDiff < fiveSeconds);
                    const check2 = candleTimeDiff >= 0 && candleTimeDiff <= fiveSeconds;

                    if (check1 || check2) {
                        CandleModel.addCandle(candle) //Event Candle addition not Permitted to Mem
                        .catch((error) => {
                            throw error;
                        });
                    } 
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
                this.logger.warn(`Candle Repository [Store MongoDB Error]: ${error.message}`);
            })
        }
    }

    fromExchangeResponse(fromExchange) {
        const fromExchangeCandles = [...fromExchange];
        // Sorting of candles in Ascending Order
        fromExchangeCandles.sort((a, b) => a.time - b.time);
        const retouchedCandles = [];
        fromExchangeCandles.forEach((candle, index) => {
            const { high, low, close, open, volume, time} = candle;
            if (retouchedCandles[retouchedCandles.length - 1]) {
                // Removing Duplicates and unsorted minorities
                if (time > retouchedCandles[retouchedCandles.length - 1].time) {
                    retouchedCandles.push({high, low, close, open, volume, time});
                }
            } else {
                retouchedCandles.push({high, low, close, open, volume, time});
            }
        })
        return retouchedCandles;
    }

    async storeToDatabase(data, quick = false) {
        if (this.CandleModel === CandleModel) {
            // reverse the order
            data.sort((a, b) => b.time - a.time);
            // console.log('storage 1')
            await this.storeMongoDB(data, quick);
        } else {
            // console.log('Storage 2')
            await this.CandleModel.addCandles(data);
            await this.storeMongoDB(data, true);
        }
    }
    /**
     * It can be dicovered that some cases
     * The candles may not be complete
     * and might also be duplicated
     * And an adjustment is been made from that
     */

    async fetchCandlesByTimeDifference({exchange, symbol, period, startTime, endTime, quick=false}) {
        try {
            // console.time('CandeFetch')
            const {name: exchangeName} = exchange;
            this.createEvent(exchange, symbol, period);
            const timeDifference = periodToTimeDiff(period);
            const startTimeTimestamp = new Date(startTime).getTime();
            const endTimeTimestamp = new Date(endTime).getTime();
            const numberOfCandlesNeeded = Math.round(Math.abs(endTimeTimestamp - startTimeTimestamp) / timeDifference);
            // console.time('From Database');
            const fromDatabase = await this.CandleModel.fetchCandles({period, number: numberOfCandlesNeeded, exchangeName, symbol, from: startTime, to: endTime});
            // console.log(`From database length: ${fromDatabase.length}`)
            // console.log(`Required Length: ${numberOfCandlesNeeded}`)
            // console.timeEnd('From Database');
            if (numberOfCandlesNeeded > fromDatabase.length) {
                // console.time('From Exchange');
                const fromExchange = await exchange.fetchCandles(symbol, period, startTime, endTime);
                // console.log(`Gotten from exchange: ${fromExchange.length}`)
                // console.timeEnd('From Exchange');
                // console.time('Store Database');
                await this.storeToDatabase(fromExchange, quick);
                // console.timeEnd('Store Database');
                if (quick === true) {
                    return this.fromExchangeResponse(fromExchange);
                }
            } else {
                return fromDatabase;
            }
            // console.time('Refetch Database');
            const refetched = await this.CandleModel.fetchCandles({period, number: numberOfCandlesNeeded,  exchangeName, symbol, from: startTime, to: endTime});
            // console.timeEnd('Refetch Database');
            return refetched;
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByTimeDifference): Error Fetching Candles [${exchange.name}: ${symbol}] (${error.message})`);
            return undefined;
        }
    }

    async fetchCandlesByNumberFromNow({exchange, symbol, period, length}) {
        try {
            const {name: exchangeName} = exchange;
            const autoConfig = {to: Date.now()};
            if (this._defaultToDate) {
                autoConfig.to = this._defaultToDate; 
            }

            // Meant to solve the probelm of Incomplete candles
            if (!this._approvedSize) {
                this._approvedSize = {};
            }
            const approvedSizekey = `${exchangeName}_${symbol}_${period}_${length}`;
            const currentApprovedSize = this._approvedSize[approvedSizekey];


            // console.log(`Required Length: ${length}`)
            this.createEvent(exchange, symbol, period);
            const fromDatabase = await this.CandleModel.fetchCandles({period, exchangeName, symbol, number: length, ...autoConfig});
            // console.log(`From database: ${fromDatabase.length}`);
            if ((fromDatabase.length >= length) || (currentApprovedSize && (fromDatabase.length >= currentApprovedSize))) {
                return fromDatabase;
            } else {
                const timeDifference = periodToTimeDiff(period);
                const startTime = new Date(Date.now() - (timeDifference * length));
                const fromExchange = await exchange.fetchCandles(symbol, period, startTime);
                // console.log(`From Exchange: ${fromExchange.length}`);
                await this.storeToDatabase(fromExchange);
                // const exchangeResp = this.fromExchangeResponse(fromExchange);
                // console.log(`Exchange Response: ${exchangeResp.length}`);
                // return exchangeResp;
            }
            // Had to add autoConfig because of backtest
            const refetched = await this.CandleModel.fetchCandles({period, exchangeName, symbol, number: length, ...autoConfig});
            this._approvedSize[approvedSizekey] = refetched.length;
            // console.log(`Refetched: ${refetched.length}`);
            return refetched;
        } catch (error) {
            this.logger.error(`Candles Repository (fetchCandlesByNumberFromNow): Error Fetching Candles [${exchange.name}: ${symbol}] (${error.message})`);
        }
    }
}
