module.exports = class ExchangePair {
    constructor (eventEmitter, logger, exchangeManager) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;
        this.exchangeManager = exchangeManager;
    }

    init(exchangeName, symbol) {
        this.symbol = symbol;
        this.exchangeName = exchangeName;
    }

    async setup() {
        try {
            this.exchange = this.exchangeManager.find(this.exchangeName);
            if (!this.exchange)  throw new Error(`Unable to find exchange ${this.exchangeName}`);
            const { symbol, exchangeName } = this;
            const self = this;
            this.info = await this.exchange.fetchPairInfo(symbol);
            this.setupDone = true;
        } catch (error) {
            this.logger.error(`Exchange Pair [${this.symbol}:${this.exchangeName}]: Unable to setup the Pair (${error.message})`);
        }
    }

    setTicker(ticker) {
        this.ticker  = ticker;
        return this.ticker;
    }

    getTicker() {
        return this.ticker;
    }

    setLastPrice(lastPrice) {
        this.lastPrice  = parseFloat(lastPrice);
        return this.lastPrice;
    }
    getLastPrice () {
        return this.lastPrice
    }

    setOrderBook(orderBook) {
        this.orderBook  = orderBook;
        return this.orderBook;
    }

    getOrderBook () {
        return this.orderBook;
    }

    setMarkPrice(markPrice) {
        if (this.exchange.isFutures) {
            this.markPrice  = parseFloat(markPrice);
            return this.markPrice;
        }
        return undefined;
    }

    getMarkPrice() {
        return this.markPrice;
    }

    getlastSignal() {
        return this._lastSignal;
    }

    getEnvironment() {
        return {
            backtest: true
        }
    }

    setLastSignal(signal) {
        if (!['long', 'short', 'close'].includes(signal)) return;
        this._lastSignal = signal;
    }

    async setLeverage(leverage) {
        if (this.exchange.isFutures) {
            this._leverage  = parseInt(leverage);
            return this._leverage;
        }
        return undefined;
    }
    async getLeverage() {
        if (this.exchange.isFutures) {
            return this._leverage
        }
        return undefined;
    }

    setTime(time) {
        this._time  = parseInt(time);
        return this._time;
    }

    getTime() {
        return this._time;
    }

    isFutures() {
        return this.exchange.isFutures;
    }
}
