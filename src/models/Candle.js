const mongoose  = require('../providers/Mongo')
const config = require('config');
const _ = require('lodash')
const upsertMany = require('@meanie/mongoose-upsert-many');

const periodToTimeDiff = require('../utils/periodToTimeDiff')

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
    }
},{ timestamps: { 
    createdAt: 'createdAt', 
    updatedAt : "updatedAt" 
}
});

// Upsert Many Plugin
mongoose.plugin(upsertMany);

class CandleAction {
    static async fetchCandleByTimeDifference(period, exchangeName, symbol, from, to = Date.now()) {
        const thisTime = new Date(to);
        const laterTime = new Date(from);
        const res = await this.find({
            period,
            exchangeName,
            symbol,
            $and : [
                {time: {$gte: laterTime}},
                {time: {$lte: thisTime}},
            ]
        }).limit(number).sort({time: 1}).exec();
        return _.uniqBy(res, 'time')

    }

    static async fetchCandlesByNumber(period, exchangeName, symbol, number= 200) {
        const timeDifference = periodToTimeDiff(period);
        const thisTime = new Date(Date.now());
        const laterTime = new Date(Date.now() - (timeDifference * number));
        const res = await this.find({
            period,
            exchangeName,
            symbol,
            $and : [
                {time: {$gte: laterTime}},
                {time: {$lte: thisTime}},
            ]
        }).limit(number).sort({time: 1}).exec();
        return _.uniqBy(res, 'time')
    }

    static async addCandle({time, open, high, close, low, volume, period, exchangeName, symbol}) {
        const candle = { time, open, high, close, low, volume, period, exchangeName, symbol };
        const candles = [candles]
        const matchFields = ['period', 'time', 'exchangeName', 'symbol'];
        const result = await this.upsertMany(candles, matchFields);
        return candle;
    }

    static async addCandles(candles) {
        const matchFields = ['period', 'time', 'exchangeName', 'symbol'];
        //Perform bulk operation
        const result = await this.upsertMany(candles, matchFields);
        console.info(result);
        return candles;
    }
}

candleSchema.loadClass(CandleAction);

//candleSchema.plugin(mongoosePaginate);

const CandleModel = mongoose.model('Candle', candleSchema);

module.exports = CandleModel

