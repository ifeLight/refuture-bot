const mongoosePaginate = require('mongoose-paginate-v2');

const mongoose  = require('../providers/Mongo')
const config = require('config');
const _ = require('lodash');

const Types = mongoose.Schema.Types;

const tradeSchema = mongoose.Schema({
    type: String,
    entryTime: Number,
    entry: Number,
    amount: Number,
    close: Number,
    fee: Number,
    profit: Number,
    closeTime: Number,
    closedBy: String,
    entryDate: Date,
    closeDate: Date,
    profitInPercentage: Number,
    currentBalance: Number
});

const backtestSchema = mongoose.Schema({
    balance: Number,
    stopLoss: Number,
    takeProfit: Number,
    positionType: String,
    maximumBalance: Number,
    minimumBalance: Number,
    entryTime: Date,
    leverage: Number,
    exchangeFee: Number,
    maximumDrawdown: Number,
    maximumProfit: Number,
    maximumLoss: Number,
    positionEntry: Number,
    totalTrades: Number,
    profitTrades: Number,
    unprofitTrades: Number,
    amount: Number,
    symbol: String,
    exchange: String,
    orderType: String,
    roi: Number,
    startDate: Date,
    endDate: Date,
    safeties: {
        type: Types.Mixed
    },
    indicators: {
        type: Types.Mixed
    },
    trades: [tradeSchema]
},{ timestamps: { 
    createdAt: 'createdAt', 
    updatedAt : "updatedAt" 
}});

backtestSchema.plugin(mongoosePaginate);

const BacktestModel = mongoose.model('Backtest', backtestSchema);

module.exports = BacktestModel;