const mongoose  = require('../providers/Mongo')
const config = require('config');
const _ = require('lodash')
const upsertMany = require('@meanie/mongoose-upsert-many');

const periodToTimeDiff = require('../utils/periodToTimeDiff')
const logger = require('../utils/logger')

const Types = mongoose.Schema.Types;

const candleSchema = mongoose.Schema({
    time: {
        type: Date,
        required: true
    },
    open: {
        type: Number,
        required: true,
    },
    high: {
        type: Number,
        required: true,
    },
    close: {
        type: Number,
        required: true,
    },
    low: {
        type: Number,
        required: true,
    },
    volume: {
        type: Number,
        required: true,
    },
    period: {
        type: String,
        required: true,
    },
    exchangeName: {
        type: String,
        required: true,
    },
    symbol: {
        type: String,
        required: true,
    }
},{ timestamps: { 
    createdAt: 'createdAt', 
    updatedAt : "updatedAt" 
}
});

// Upsert Many Plugin
mongoose.plugin(upsertMany);

class CandleAction {
    static async fetchCandles({period, exchangeName, symbol, number= 200, from, to = Date.now()}) {
        let laterTime, thisTime;
        if (from) {
            thisTime = new Date(to);
            laterTime = new Date(from);
        } else {
            const timeDifference = periodToTimeDiff(period);
            thisTime = new Date(to);
            laterTime = new Date(to - (timeDifference * number));
        }
        try {
            const res = await this.find({
                period,
                exchangeName,
                symbol,
                $and : [
                    {time: {$gte: laterTime}},
                    {time: {$lte: thisTime}},
                ]
            }).limit(number).sort({time: 1}).exec();
            const remap = res.map((candle) => {
                const { time, high, low, open, close, volume } = candle;
                const toTimestamp = new Date(time).getTime();
                return {
                    high, low, open, close, volume,
                    time: toTimestamp
                }
            })
            return _.uniqBy(remap, 'time')
        } catch (error) {
            logger.warn(`Candle Model: Unable to fetch data [${symbol}:${exchangeName}:${period}] (${error.message})`);
            return undefined;
        }  
    }

    static async addCandle({time, open, high, close, low, volume, period, exchangeName, symbol}) {
        const candle = { time, open, high, close, low, volume, period, exchangeName, symbol };
        const candles = [candle]
        const matchFields = ['period', 'time', 'exchangeName', 'symbol'];
        const result = await this.upsertMany(candles, matchFields);
        return candle;
    }

    static async addCandles(candles) {
        const matchFields = ['period', 'time', 'exchangeName', 'symbol'];
        //Perform bulk operation
        const result = await this.upsertMany(candles, matchFields);
        return candles;
    }
}

candleSchema.loadClass(CandleAction);

//candleSchema.plugin(mongoosePaginate);

const CandleModel = mongoose.model('Candle', candleSchema);

module.exports = CandleModel

