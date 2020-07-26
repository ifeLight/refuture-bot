module.exports = class Ticker {
    constructor ({bidPrice, bidQty, askPrice, askQty, lastPrice}) {
        this.bidPrice = parseFloat(bidPrice);
        this.bidQty = parseFloat(bidQty);
        this.askPrice = parseFloat(askPrice);
        this.askQty = parseFloat(askQty);
        this.lastPrice = parseFloat(lastPrice);
    }
}