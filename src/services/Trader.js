const StrategyManager = require('../modules/managers/StrategyManager');

const eventEmitter = require('../events/EventEmitter');
const logger = require('../utils/logger');

const { candlesRepository, exchangeManager, notifier } = require('./preService')

class Trader {
    constructor () {
        this.logger = logger;
        this. eventEmitter = eventEmitter;
        this.notifier = notifier;
    }

    async start(instances) {
        try {
            const { logger, eventEmitter, notifier } = this;
            const strategyManager = new StrategyManager({ logger, eventEmitter, notifier, candlesRepository, exchangeManager });
            if (!exchangeManager.setupDone) {
                await exchangeManager.setup();
            }
            await strategyManager.init();
            instances.forEach(instance => {
                strategyManager.add(instance);
            });
            await strategyManager.runStrategies();
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Trader;