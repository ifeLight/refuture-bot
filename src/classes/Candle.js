module.exports = class Candle {
    constructor (openTime, open, high, low, close, volume, period="1m") {
        this.open = open;
        this.close = close;
        this.high = high;
        this.close = close;
        this.low = low;
        this.period = period;
        this.volume = volume;
        this.openTime = openTime;
    }

    getAverage() {}
    
}