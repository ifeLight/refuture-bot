const express = require('express');

const HyperCtrl = require('./controllers/Hyper');
const BacktestCtrl = require('./controllers/Backtest')

const api = express();

// Hyper Endpoints
api.get('/hyper', HyperCtrl.getHyperList);
api.get('/hyper/:id', HyperCtrl.getHyper);

// Backtest Endpoint
api.get('/backtest', BacktestCtrl.getBacktestList);
api.get('/backtest/:id', BacktestCtrl.getBacktest);

module.exports = api;