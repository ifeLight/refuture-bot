const path = require('path');
const requireAll = require('require-all');

const IndicatorBuilder = require('./manager-helpers/IndicatorBuilder');
const IndicatorPeriod = require('./manager-helpers/IndicatorPeriod');

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

    async run( indicatorName, exchangePair, options) {
        try {
            const { symbol, exchangeName } = exchangePair;
            const theIndicator = this.find(indicatorName);
            if (!theIndicator) throw new Error(`Indicator not found`);
            const theExchange = this.exchangeManager.find(exchangeName);
            if (!theExchange) throw new Error(`Exchange not found`);

            let indicatorOptions = options || theIndicator.getOptions();

            const {
                candlesRepository,
                logger,
                eventEmitter,
                exchangeManager,
            } = this;

            const indicatorBuilder = new IndicatorBuilder({
                candlesRepository,
                exchange: theExchange,
                eventEmitter,
                symbol,
                logger,
                exchangeManager
            })

            theIndicator.buildIndicators(indicatorBuilder, indicatorOptions);
            const builtIndicators = await indicatorBuilder.buildIndicators();
            if (!builtIndicators) throw new Error('Error building indicators');

            const indicatorPeriod = new IndicatorPeriod(this.logger);

            await indicatorPeriod.setup(exchangePair, indicatorBuilder)
            
            const indicatorResult = await theIndicator.period(indicatorPeriod, indicatorOptions);
            indicatorResult.setTag(indicatorName);
            
            return indicatorResult;
            
        } catch (error) {
            this.logger.warn(`Indicator Manager: Error running [${indicatorName}:${symbol}:${exchangeName}] (${error.message})`);
            return undefined;
        }
    }
}

module.exports = IndicatorManager;