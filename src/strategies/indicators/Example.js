const technicalindicators = require('technicalindicators')

module.exports = class {
    getName() {
        return 'ifeSma';
    }

    buildIndicators(indicatorBuilder, options) {
        indicatorBuilder.add('candles_15', 'candles', {
            period: options.period
        })
    }

    async period(indicatorPeriod, options) {
        
    }
    
    getDefaultOptions() {
        return {
            period: '15m'
        }
    }

}