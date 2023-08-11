const CandlesRepository = require('../modules/repository/CandlesRepository');
const ExchangeManager = require('../modules/managers/ExchangeManager');
const Notifier = require('../notify')

const logger = require('../backtest/utils/logger');
const eventEmitter = require('../backtest/utils/eventEmitter');

exports.candlesRepository = new CandlesRepository(eventEmitter, logger);
exports.exchangeManager = new ExchangeManager(eventEmitter, logger);
exports.notifier = new Notifier(logger);