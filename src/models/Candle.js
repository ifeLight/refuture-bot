const mongoose  = require('../providers/Mongo')
const config = require('config');
const _ = require('lodash')
const upsertMany = require('@meanie/mongoose-upsert-many');

const periodToTimeDiff = require('../utils/periodToTimeDiff')
 
mongoose.plugin(upsertMany);

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
},{ timestamps: { 
    createdAt: 'createdAt', 
    updatedAt : "updatedAt" 
}
});

class CandleAction {
    static async fetchCandleByTimeDifference(period, from, to = Date.now()) {
        const thisTime = new Date(to);
        const laterTime = new Date(from);
        const res = await this.find({
            period,
            $and : [
                {time: {$gte: laterTime}},
                {time: {$lte: thisTime}},
            ]
        }).limit(number).sort({time: 1}).exec();
        return _.uniqBy(res, 'time')

    }

    static async fetchCandlesByNumber(period, number= 200) {
        const timeDifference = periodToTimeDiff(period);
        const thisTime = new Date(Date.now());
        const laterTime = new Date(Date.now() - (timeDifference * number));
        const res = await this.find({
            period,
            $and : [
                {time: {$gte: laterTime}},
                {time: {$lte: thisTime}},
            ]
        }).limit(number).sort({time: 1}).exec();
        return _.uniqBy(res, 'time')
    }

    static async addCandle({time, open, high, close, low, volume, period}) {
        const candle = { time, open, high, close, low, volume, period };
        const candles = [candles]
        const matchFields = ['period', 'time'];
        const result = await this.upsertMany(candles, matchFields);
        return candle;
    }

    static async addCandles(candles) {
        const matchFields = ['period', 'time'];
        //Perform bulk operation
        const result = await this.upsertMany(candles, matchFields);
        return candles;
    }
}

candleSchema.loadClass(CandleAction);

//candleSchema.plugin(mongoosePaginate);

const CandleModel = mongoose.model('Candle', candleSchema);

module.exports = CandleModel

