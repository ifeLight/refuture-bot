const express = require('express');
var cors = require('cors')

const HyperCtrl = require('./controllers/Hyper');
const BacktestCtrl = require('./controllers/Backtest');
const CandlesCtrl = require('./controllers/Candles');
const StrategyCtl = require('./controllers/Strategy')

const api = express();

api.use(cors());

// Hyper Endpoints
api.get('/hyper', HyperCtrl.getHyperList);
api.get('/hyper/:id', HyperCtrl.getHyper);

// Backtest Endpoint
api.get('/backtest', BacktestCtrl.getBacktestList);
api.get('/backtest/:id', BacktestCtrl.getBacktest);

//Candles Endpoint
api.get('/candles', CandlesCtrl.getCandles);

// Strategy List
api.get('/strategies/indicators', StrategyCtl.getIndicators);
api.get('/strategies/safeties', StrategyCtl.getSafeties);
api.get('/strategies/insurances', StrategyCtl.getInsurances)

module.exports = api;