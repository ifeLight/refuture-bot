const { AsyncNedb } = require('nedb-async')
const _ = require('lodash');
const periodToTimeDiff = require('../utils/periodToTimeDiff');

class CandleMem {

    constructor () {
        this.db = new AsyncNedb();
    }

    async addCandles (candles) {
        return (await this.bulkInsert(candles));
    }

    async addCandle ({time, open, high, close, low, volume, period, exchangeName, symbol}) {
        const candle = { time, open, high, close, low, volume, period, exchangeName, symbol };
        const candles = [candle];
        return (await this.bulkInsert(candles));
    }

    async fetchCandles ({period, exchangeName, symbol, number= 200, from, to = Date.now()}) {
        let laterTime, thisTime;
        if (from) {
            thisTime = new Date(to);
            laterTime = new Date(from);
        } else {
            const timeDifference = periodToTimeDiff(period);
            thisTime = new Date(to);
            laterTime = new Date(to - (timeDifference * number));
        }
        const db = this.db;
        try {
            laterTime = new Date(laterTime).getTime();
            thisTime = new Date(thisTime).getTime();
            const res = await db.asyncFind({
                period,
                exchangeName,
                symbol,
                $and : [
                    {time: {$gte: laterTime}},
                    {time: {$lte: thisTime}},
                ]
            }, [['sort', { time: 1 }], ['limit', number]]);

            const remap = res.map((candle) => {
                const { time, high, low, open, close, volume } = candle;
                const toTimestamp = new Date(time).getTime();
                return {
                    high, low, open, close, volume,
                    time: toTimestamp
                }
            })
            return _.uniqBy(remap, 'time');
        } catch (error) {
            throw error;
        }
    }

    async bulkInsert(candles) {
        try {
            if (candles && Array.isArray(candles)) {
                for (const candle of candles) {
                    const {period, time, exchangeName, symbol} = candle;
                    const res = await this.db.asyncUpdate(
                        {period, time, exchangeName, symbol},
                        candle, {upsert: true, multi: false}
                    );
                }
            }
            return true;
        } catch (error) {
            throw error;
        }
    }
}

const candleMem = new CandleMem();

module.exports = candleMem;