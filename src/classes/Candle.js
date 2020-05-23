module.exports = class Candle {
    constructor ({open, close, high, low, openTime, volume, closeTime, period="5m"}) {
        this.open = open;
        this.close = close;
        this.high = high;
        this.close = close;
        this.low = low;
        this.period = period;
        this.volume = volume;
        this.openTime = openTime;
        this.closeTime = closeTime
    }

    getAverage() {}
    
}