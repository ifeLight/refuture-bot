module.exports = class ExchangePair {
    constructor (eventEmitter) {
        this.eventEmitter = eventEmitter;
    }

    init(exchange, symbol) {
        this.exchange = exchange;
        this.symbol = symbol;
        // Add Ticker listener
        this.exchange.addTickerEvent(this.symbol);
        this.exchangeName = this.exchange.name;
    }

    async setup() {
        const { symbol, exchangeName } = this
        this.info = await this.exchange.fetchPairInfo(symbol);
        this.ticker = await this.exchange.fetchTicker(symbol);
        this.lastPrice = this.ticker.lastPrice;
        self = this;
        this.eventEmitter.on(`ticker_${exchangeName}_${symbol}`, function(ticker) {
            self.ticker = ticker;
            self.lastPrice = ticker.lastPrice;
        })
    }

    getTicker() {
        return this.ticker;
    }

    getLastPrice () {
        return this.lastPrice
    }
}