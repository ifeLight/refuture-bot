module.exports = class PairInfo {
    constructor({id, base, symbol, quote, precision, limits, active, fees}) {
        this.id = id;
        this.symbol = symbol;
        this.base = base;
        this.quote = quote;
         /**
          * Precision is in this form
          * precision: { base: 8, quote: 8, amount: 6, price: 2 },
          */
        this.precision = precision;
        /**
         * Limits is in this form
         * limits: {
                amount: { min: 0.000001, max: 9000 },
                price: { min: 0.01, max: 1000000 },
                cost: { min: 10, max: undefined },
                market: { min: 0, max: 424.36491233 }
            }
         */
        this.limits = limits;
        this.active = active;
        this.fees = fees;
        /**
         * Fees is in this form
         * fees: {  percentage: true, taker: 0.001, maker: 0.001 }
         */


    }
}