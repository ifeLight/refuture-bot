module.exports = class ExchangePair {
    constructor (eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
    }

    init(exchange, symbol) {
        this.exchange = exchange;
        this.symbol = symbol;
        this.exchangeName = this.exchange.name;
    }

    async setup() {
        try {
            const { symbol, exchangeName } = this;
            self = this;
            // Add Ticker listener
            this.exchange.addTickerEvent(this.symbol);
            this.info = await this.exchange.fetchPairInfo(symbol);
            this.ticker = await this.exchange.fetchTicker(symbol);
            this.orderBook = await this.exchange.fetchOrderBook(symbol);
            this.markPrice = undefined;
            if (this.exchange.isFutures) {
                this.markPrice = await this.exchange.fetchMarkPrice(symbol);
                this.eventEmitter.on(`markprice_${exchangeName}_${symbol}`, (markPrice)  => {
                    this.markPrice = markPrice;
                })
            }
            
            this.lastPrice = this.ticker.lastPrice;
            this.eventEmitter.on(`ticker_${exchangeName}_${symbol}`, (ticker) => {
                this.ticker = ticker;
                this.lastPrice = ticker.lastPrice;
            })
            this.eventEmitter.on(`orderbook_${exchangeName}_${symbol}`, (orderBook) => {
                this.orderBook = orderBook;
            })

            this.setupDone = true;
        } catch (error) {
            this.logger.error(`Pair(${this.symbol}): Unable to setup the Pair`)
        }
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
        return this.markPrice;
    }
    
    /**
     * Private Trade Functions
     */
    async getBalance (asset) {
        try {
            return await this.exchange.fetchBalance(asset);
        } catch (error) {
            this.logger(`Pair(${this.symbol}): Unable to fetch balance for ${this.asset}`);
        }
    }

    async getActiveOrders() {
        try {
            const orders = await this.exchange.fetchActiveOrders(this.symbol);
            return orders;
        } catch (error) {
            this.logger(`Pair(${this.symbol}): Unable to Get Orders (${error.message})`);
        }
    }

    async getPositions() {
        try {
            const positions = await this.exchange.fetchPositions(this.symbol);
            return positions;
        } catch (error) {
            this.logger(`Pair(${this.symbol}): Unable to Get Positions (${error.message})`);
        }
    }
}