module.exports = class ExchangePair {
    constructor (eventEmitter) {
        
    }

    init(exchange, symbol) {
        this.exchange = exchange;
        this.symbol = symbol
    }

    async setup() {
        this.info = await this.exchange.fetchPairInfo(this.symbol)
    }
}