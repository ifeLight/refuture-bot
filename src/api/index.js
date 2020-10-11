const express = require('express');
var cors = require('cors')

const HyperCtrl = require('./controllers/Hyper');
const BacktestCtrl = require('./controllers/Backtest');
const CandlesCtrl = require('./controllers/Candles');

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

module.exports = api;