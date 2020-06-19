const path = require('path');
const requireAll = require('require-all');
const IndicatorBuilder = require('./manager-helpers/IndicatorBuilder');

class IndicatorManager {
    constructor({candlesRepository, logger, eventEmitter, exchangeManager}) {
        this.candlesRepository = candlesRepository;
        // this.tradePair = tradePair;
        this.indicatorsList = [];
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.exchangeManager = exchangeManager;
        const indicatorDir = path.join(__dirname, '../../', 'strategies','indicators');
        const indicatorObject = requireAll(indicatorDir);
        const indicators = {};
        Object.keys(indicatorObject).forEach((key) => {
            try {
                let theIndicator = new indicatorObject[key]();
                let theIndicatorName = theIndicator.getName();
                indicators[theIndicatorName] = theIndicator;
            } catch (error) {
                this.logger.warn(`indicator Manager: Error loading indicators (${error.message})`);
            }
        })
        this.indicators = indicators;
    }

    find(indicatorName) {
        return this.indicators[indicatorName];
    }

    getList(){
        return this.indicators; // It returns an Object
    }

    async run(indicatorName, symbol, exchangeName, options) {
        try {
            const theIndicator = this.find(indicatorName);
            if (!theIndicator) throw new Error(`Indicator not found`);
            const theExchange = this.exchangeManager.find(exchangeName);
            if (!theExchange) throw new Error(`Exchange not found`);

            const indicator
            
        } catch (error) {
            this.logger.warn(`Indicator Manger: Error running [${indicatorName}:${symbol}:${exchangeName} (error.message)]`);
        }
    }
}