const Candle = require('../../classes/Candle');

module.exports = class CandleRepository {
    constructor(exchange, period) {
        this.exchange = exchange;
        this.period = period;
    }

    fetchCandlesByTimeDifference(startTime, endTime) {

    }

    fetchCandlesByNumberFromNow(numberOfCandlesFromNow) {
        
    }
}