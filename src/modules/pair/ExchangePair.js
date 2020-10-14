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
            if (!this.exchangeManager.setupDone) {
                await this.exchangeManager.setup();
            }
            this.exchange = this.exchangeManager.find(this.exchangeName);
            if (!this.exchange)  throw new Error(`Unable to find exchange ${this.exchangeName}`);
            const { symbol, exchangeName } = this;
            const self = this;
            
            this.info = await this.exchange.fetchPairInfo(symbol);
            this.ticker = await this.exchange.fetchTicker(symbol);
            this.orderBook = await this.exchange.fetchOrderBook(symbol);
            this.markPrice = undefined;
            // Add Ticker listener
            this.exchange.addTickerEvent(this.symbol);
            //Enable Socket
            await this.exchange.enableSocket();
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
            this.logger.error(`Exchange Pair [${this.symbol}:${this.exchangeName}]: Unable to setup the Pair (${error.message})`);
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

    getlastSignal() {
        return this._lastSignal;
    }

    setLastSignal(signal) {
        if (!['long', 'short', 'close'].includes(signal)) return;
        this._lastSignal = signal;
    }

    getTime() {
        return Date.now();
    }

    async setLeverage(leverage) {
        if (this.exchange.isFutures) {
            const res = await this.exchange.changeLeverage(this.symbol, parseInt(leverage));
            return res;
        }
        return undefined;
    }
    async getLeverage() {
        if (this.exchange.isFutures) {
            const leverage = await this.exchange.getLeverage(this.symbol);
            return leverage;
        }
        return undefined;
    }

    getEnvironment() {
        return {
            backtest: false
        }
    }
    
    /**
     * Private Trade Functions
     */
    async getBalance (asset) {
        try {
            return await this.exchange.fetchBalance(asset);
        } catch (error) {
            this.logger(`Pair(${this.symbol}): Unable to fetch balance for ${this.asset}`);
            return undefined;
        }
    }

    async getActiveOrders() {
        try {
            const orders = await this.exchange.fetchActiveOrders(this.symbol);
            return orders;
        } catch (error) {
            this.logger(`Pair(${this.symbol}): Unable to Open Get Orders (${error.message})`);
            return undefined;
        }
    }

    async getClosedOrders() {
        try {
            const orders = await this.exchange.fetchClosedOrders(this.symbol);
            return orders;
        } catch (error) {
            this.logger(`Pair(${this.symbol}): Unable to Get Closed Orders (${error.message})`);
            return undefined;
        }
    }

    async getPositions() {
        if (this.exchange.isFutures) {
            try {
                const positions = await this.exchange.fetchPositions(this.symbol);
                return positions;
            } catch (error) {
                this.logger(`Pair(${this.symbol}): Unable to Get Positions (${error.message})`);
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    async createMarketOrder(side, amount) {
        return this.exchange.createMarketOrder(this.symbol, side, amount);
    }

    async createLimitOrder(side, amount, price) {
        return this.exchange.createLimitOrder(this.symbol, side, amount, price);
    }

    async createOrder(type, side, amount, price, params = {}) {
        return this.exchange.createOrder(this.symbol, type, side, amount, price, params);
    }

    async cancelActiveOrders(orderId) {
        if (orderId) {
            return this.exchange.cancelActiveOrder(orderId, this.symbol);
        }
        return this.exchange.cancelActiveOrders(this.symbol);
    }
    
}
