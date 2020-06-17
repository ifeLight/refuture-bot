const path = require('path');
const requireAll = require('require-all');

module.exports =  class IndicatorBuilder {
    constructor({candlesRepository, exchange, symbol, logger, eventEmitter, exchangeManager}) {
        this.exchange = exchange;
        this.candlesRepository = candlesRepository;
        // this.tradePair = tradePair;
        this.symbol = symbol;
        this.indicatorsList = [];
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.exchangeManager = exchangeManager;
    }

    add(name, indicatorType, options) {
        this.indicatorsList.push({
            name,
            indicatorType,
            options
        });
    }

    list () {
        return this.indicatorsList;
    }

    getHelpers() {
        const helpersrDir = path.join(__dirname, 'indicator-builder-helpers');
        const helpersObj = requireAll(helpersrDir); //returns an Object
        const helpers = {};
        const self= this;
        Object.keys(helpersObj).forEach((key) => {
            try {
                const {symbol, candlesRepository, exchange, logger, eventEmitter, exchangeManager} = this;
                let theHelper = new helpersObj[key]({symbol, candlesRepository, exchange, logger, eventEmitter, exchangeManager});
                let theHelperName = theHelper.getName();
                helpers[theHelperName] = theHelper;
            } catch (error) {
                this.logger.error(`Indicator Builder: Error loading indicators for building (${error.message})`);
            }
        })
        this.helpers = helpers;
        return helpers; //It returns an Object
    }
    async buildIndicators() {
        try {
            const helpers = this.getHelpers();
            const theIndicators = {};

            for (const ind of this.indicatorsList) {
                const indicatorName = ind.name;
                const inidicatorType = ind.indicatorType 
                const options = ind.options;
                const theHelper = helpers[inidicatorType];
                if (!theHelper) {
                    throw new Error(`Indicator ${inidicatorType} not found`)
                }
                
                theHelper.init(options);
                const result = await theHelper.run(build);
                theIndicators[indicatorName] = result

            }
            return theIndicators;
        } catch (error) {
            this.logger.error(`Indicator Builder: Error buildig Indicators [${this.symbol}] (${error.message})`);
            return undefined;
        }
    }
}