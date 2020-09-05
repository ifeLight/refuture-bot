const StrategyManager = require('../modules/managers/StrategyManager');

const eventEmitter = require('../events/EventEmitter');
const logger = require('../utils/logger');

const { candlesRepository, exchangeManager } = require('./preService')
// const notifier = require('../notify/index');

class Trader {
    constructor () {
        this.logger = logger;
        this. eventEmitter = eventEmitter;
        this.notifier = undefined;
    }

    start(instances) {
        try {
            const { logger, eventEmitter, notifier } = this;
            const strategyManager = new StrategyManager({ logger, eventEmitter, notifier, candlesRepository, exchangeManager });
            (async () => {
                await strategyManager.init();
                instances.forEach(instance => {
                    strategyManager.add(instance);
                });
                strategyManager.runStrategies();
            })()
            .catch((err) => {
                throw err;
            })
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Trader;