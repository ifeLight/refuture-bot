const IndicatorManager = require('../modules/managers/IndicatorManager');
const CandlesRepository = require('../modules/repository/CandlesRepository');
const ExchangeManager = require('../modules/managers/ExchangeManager');
const ExchangePair = require('../backtest/ExchangePair');
const logger = require('../backtest/utils/logger');
const eventEmitter = require('../backtest/utils/eventEmitter');


class Backtest {
    constructor(parameters) {
        this.parameters = parameters,
        this.logger = logger,
        this.eventEmitter = eventEmitter;
        this.exchangeManager = new ExchangeManager(eventEmitter, logger);
        this.exchangePair = new ExchangePair(eventEmitter, logger, this.exchangeManager);
        this.candlesRepository = new CandlesRepository(eventEmitter, logger, true);
        const {
            candlesRepository,
            exchangeManager
        } = this;
        this.indicatorManager = new IndicatorManager({
            candlesRepository,
            logger,
            eventEmitter,
            exchangeManager
        })
    }

    async start() {

    }
}

module.exports =  Backtest;