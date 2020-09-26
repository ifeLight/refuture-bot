const technicalindicators = require('technicalindicators')

module.exports = class FixedStopLoss {
    getName() {
        return 'trailer-chandelier';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
    }

    buildIndicators(indicatorBuilder, options) {
        
    }

    async period(safetyPeriod, options, strat) {
        
        return safetyPeriod.createEmptySignal();
    }
    
    getOptions() {
        return {
            percentage: 5
        }
    }

}