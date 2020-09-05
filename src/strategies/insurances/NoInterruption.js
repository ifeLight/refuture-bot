const technicalindicators = require('technicalindicators')

module.exports = class NoInterruption {
    /**
     * This Insurance is to prevent Interruption when a trade is On already
     */
    getName() {
        return 'no-interruption';
    }

    buildIndicators(indicatorBuilder, options) {
        
    }

    async period(safetyPeriod, signalResult,  options, strat) {
        const isFutures = safetyPeriod.isFutures();
        if (isFutures) {
            const positions = await getPositions();
            if (positions && Array.isArray(positions) && positions.length > 0) {
                return safetyPeriod.createEmptySignal()
            }
            return signalResult;
        } else {
            const {amount, currency_amount} = strat.trade;
            let tradeAmount = amount ? Number(amount) : Number(safetyPeriod.getLastPrice()) / Number(currency_amount);
            const baseCurrency = (safetyPeriod.getPairInfo()).base;
            let baseBalance = await safetyPeriod.getBalance(baseCurrency);
            const totalBalance = baseBalance.locked + baseBalance.free;
            if (tradeAmount < (totalBalance +  (0.1 * totalBalance))) {
                return safetyPeriod.createEmptySignal()
            }
            return signalResult
        }
    }
    
    getOptions() {
        return {};
    }

}