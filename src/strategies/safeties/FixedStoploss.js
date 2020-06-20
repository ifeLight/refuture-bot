const technicalindicators = require('technicalindicators')

module.exports = class FixedStopLoss {
    getName() {
        return 'fixed-stoploss';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
    }

    buildIndicators(indicatorBuilder, options) {
        
    }

    async period(safetyPeriod, options) {
        
    }
    
    getOptions() {
        return {
            percentage: '5'
        }
    }

}