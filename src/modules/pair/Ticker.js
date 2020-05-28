module.exports = class Ticker {
    constructor ({bidPrice, bidQty, askPrice, askQty, lastPrice}) {
        this.bidPrice = bidPrice;
        this.bidQty = bidQty;
        this.askPrice = askPrice;
        this.askQty = askQty;
        this.lastPrice = lastPrice
    }
}