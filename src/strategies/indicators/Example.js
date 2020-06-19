const technicalindicators = require('technicalindicators')

module.exports = class {
    getName() {
        return 'ifeSma';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
    }

    buildIndicators(indicatorBuilder, options) {
        indicatorBuilder.add('candles_15', 'candles', {
            period: options.period
        })
    }

    async period(indicatorPeriod, options) {
        
    }
    
    getOptions() {
        return {
            period: '15m'
        }
    }

}