const IndicatorPeriod = require("./IndicatorPeriod");

class SafetyPeriod extends IndicatorPeriod {
    constructor(logger) {
        super(logger);
    }

    async getBalance (asset) {
        return this.exchangePair.getBalance()
    }

    async getActiveOrders() {
        return this.exchangePair.getActiveOrders()
    }

    async getPositions() {
        return this.exchangePair.getPositions()
    }

    getPairInfo() {
        return this.exchangePair.info;
    }
}

module.exports = SafetyPeriod;