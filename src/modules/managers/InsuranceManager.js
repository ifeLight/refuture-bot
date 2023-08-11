const path = require('path');
const requireAll = require('require-all');

const IndicatorBuilder = require('./manager-helpers/IndicatorBuilder');
const SafetyPeriod = require('./manager-helpers/SafetyPeriod')

const SignalResult = require('../../classes/SignalResult');

class InsuranceManager {
    constructor({candlesRepository, logger, eventEmitter, exchangeManager}) {
        this.candlesRepository = candlesRepository;
        // this.tradePair = tradePair;
        this.indicatorsList = [];
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.exchangeManager = exchangeManager;
        const insuranceDir = path.join(__dirname, '../../', 'strategies','insurances');
        const insuranceObject = requireAll(insuranceDir);
        const insurances = {};
        Object.keys(insuranceObject).forEach((key) => {
            try {
                let theInsurance = new insuranceObject[key]();
                let theInsuranceName = theInsurance.getName();
                insurances[theInsuranceName] = theInsurance;
            } catch (error) {
                logger.error(`Insurance Manager: Error loading Insurances (${error.message})`);
            }
        })
        this.insurances = insurances;
    }

    find(insuranceName) {
        return this.insurances[insuranceName];
    }

    getList(){
        return this.insurances; // It returns an Object
    }

    async run(insuranceName, signalResult, exchangePair, options, strat) {
        let signalResultTag;
        if (!signalResult) {
            return SignalResult.createEmptySignal()
        }
        if (signalResult.hasOwnProperty('_tag')) {
            signalResultTag = signalResult.getTag()
        }
        const { symbol, exchangeName } = exchangePair;
        try {
            const theInsurance = this.find(insuranceName);
            if (!theInsurance) throw new Error(`Insurance not found`);
            const theExchange = this.exchangeManager.find(exchangeName);
            if (!theExchange) throw new Error(`Exchange not found`);

            let insuranceDefaultOptions = theInsurance.getOptions();
            let insuranceOptions = {...insuranceDefaultOptions, ...options};

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

            theInsurance.buildIndicators(indicatorBuilder, insuranceOptions);
            const builtIndicators = await indicatorBuilder.buildIndicators();
            if (!builtIndicators) throw new Error('Error building indicators');

            const safetyPeriod = new SafetyPeriod(this.logger);

            await safetyPeriod.setup(exchangePair, indicatorBuilder)
            
            let insuranceResult = await theInsurance.period(safetyPeriod, signalResult, insuranceOptions, strat);
            if (insuranceResult) {
                insuranceResult.setTag(signalResultTag)
                return insuranceResult;
            }
            return SignalResult.createEmptySignal()
        } catch (error) {
            this.logger.warn(`Insurance Manager: Error running [${insuranceName}:${symbol}:${exchangeName}] (${error.message})`);
            return undefined;
        }
    }

    async runAllInsurances (strat, insurancesConfig, exchangePair, signalResult) {
        if (insurancesConfig && Array.isArray(insurancesConfig) && insurancesConfig.length > 0) {
            let currentSignalResult = signalResult;
            for (let insurance of insurancesConfig) {
                let insuranceResult;
                if (typeof insurance === 'string') {
                    insuranceResult = await this.run(insurance, currentSignalResult, exchangePair, null, strat);
                } else if (typeof insurance === 'object') {
                    const { name, options} = insurance;
                    insuranceResult = await this.run(name, currentSignalResult, exchangePair, options, strat);
                }
                currentSignalResult = insuranceResult;
            }
            return currentSignalResult;
        }
        return signalResult;
    }
}


module.exports = InsuranceManager;