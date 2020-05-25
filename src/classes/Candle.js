module.exports = class Candle {
    constructor (time, open, high, low, close, volume, period="5m", exchangeName, symbol) {
        this.open = Number(open);
        this.close = Number(close);
        this.high = Number(high);
        this.low = Number(low);
        this.period = Number(period);
        this.volume = Number(volume);
        this.time = Number(time);
        this.exchangeName = exchangeName;
        this.symbol = symbol
    }

    getAverage() {}
    
}