const technicalindicators = require('technicalindicators')

module.exports = class OnlyShort {
    /**
     * This Insurance is to prevent Interruption when a trade is On already
     */
    getName() {
        return 'only-short';
    }

    buildIndicators(indicatorBuilder, options) {
        
    }

    async period(safetyPeriod, signalResult,  options, strat) {
        if (!signalResult) {
            return safetyPeriod.createEmptySignal();
        }

        if (signalResult.getSignal() && signalResult.getSignal() === 'short') {
            return signalResult;
        }

        if (signalResult.getSignal() === undefined) {
            return signalResult;
        }

        return safetyPeriod.createEmptySignal();
    }
    
    getOptions() {
        return {};
    }

}