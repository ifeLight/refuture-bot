const path = require('path');
const requireAll = require('require-all');

const IndicatorBuilder = require('./manager-helpers/IndicatorBuilder');
const SafetyPeriod = requir('./manager-helpers/SafetyPeriod')

const SignalResult = require('../../classes/SignalResult')


class SafetyManager {
    constructor({logger, eventEmitter, exchangeManager, candlesRepository}) {
        this.candlesRepository = candlesRepository;
        // this.tradePair = tradePair;
        this.indicatorsList = [];
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.exchangeManager = exchangeManager;
        const safetyDir = path.join(__dirname, '../../', 'strategies','safeties');
        const safetyObject = requireAll(safetyDir);
        const safeties = {};
        Object.keys(safetyObject).forEach((key) => {
            try {
                let theSafety = new safetyObject[key]();
                let theSafetyName = theSafety.getName();
                safeties[theSafetyName] = theSafety;
            } catch (error) {
                this.logger.error(`Safety Manager: Error loading safeties (${error.message})`);
            }
        })
        this.safeties = safeties;
    }

    find(safetyName) {
        return this.safeties[safetyName];
    }

    getList(){
        return this.safeties; // It returns an Object
    }

    async runInit(safetyName, exchangePair, options) {
        return (await this.run(safetyName, exchangePair, options, true));
    }

    async run(safetyName, exchangePair, options, init=false) {
        try {
            const { symbol, exchangeName } = exchangePair;
            const theSafety = this.find(safetyName);
            if (!theSafety) throw new Error(`Safety not found`);
            const theExchange = this.exchangeManager.find(exchangeName);
            if (!theExchange) throw new Error(`Exchange not found`);

            let safetyOptions = options || theSafety.getOptions();

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

            theSafety.buildIndicators(indicatorBuilder, safetyOptions);
            const builtIndicators = await indicatorBuilder.buildIndicators();
            if (!builtIndicators) throw new Error('Error building indicators');

            const safetyPeriod = new SafetyPeriod(this.logger);

            await safetyPeriod.setup(exchangePair, indicatorBuilder)
            
            let safetyResult = await theSafety.period(safetyPeriod, safetyOptions);
            if (!init) {
                if (!safetyResult) {
                    let safetyResult = SignalResult.createEmptySignal();
                    safetyResult.setTag(safetyName);
                    return safetyResult;
                }
                safetyResult.setTag(safetyName);
                return safetyResult;
            }
            
        } catch (error) {
            this.logger.warn(`Safety Manager: Error running [${safetyName}:${symbol}:${exchangeName}] (${error.message})`);
            return undefined;
        }
    }
}

module.exports = SafetyManager;