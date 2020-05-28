module.exports = class OrderBook {
    constructor(bids, asks) {
        /**
         * Bids is an arrays of { price: '0.04896500', quantity: '0.00000000' }
         */
        this.bids = bids,
        /**
         * Asks is an arrays of { price: '0.04896500', quantity: '0.00000000' }
         */
        this.asks = asks;
    }
}