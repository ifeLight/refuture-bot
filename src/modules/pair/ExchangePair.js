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
        this.orderBook = await this.exchange.fetchOrderBook(symbol)
        this.markPrice = await this.exchange.fetchMarkPrice(symbol);
        this.lastPrice = this.ticker.lastPrice;
        self = this;
        this.eventEmitter.on(`ticker_${exchangeName}_${symbol}`, function(ticker) {
            self.ticker = ticker;
            self.lastPrice = ticker.lastPrice;
        })
        this.eventEmitter.on(`orderbook_${exchangeName}_${symbol}`, function(orderBook) {
            self.orderBook = orderBook;
        })
        this.eventEmitter.on(`markprice_${exchangeName}_${symbol}`, function(markPrice) {
            self.markPrice = markPrice;
        })
    }

    getTicker() {
        return this.ticker;
    }

    getLastPrice () {
        return this.lastPrice
    }

    getOrderBook () {
        return this.orderBook;
    }

    getMarkPrice() {

    }
    
    getBalance () {

    }
}