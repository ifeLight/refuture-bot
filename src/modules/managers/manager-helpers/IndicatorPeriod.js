const SignalResult = require('../../../classes/SignalResult');
const Storage = require('../../../classes/Storage');
const MemStorage = require('../../../classes/MemStorage')

module.exports = class IndicatorPeriod {
    constructor (logger) {
        this.logger = logger
    }
    async setup (exchangePair, indicatorBuilder) {
        this.exchangePair = exchangePair;
        this.indicatorBuilder = indicatorBuilder;
        const { exchangeName, symbol } = exchangePair
        const environment = this.getEnvironment();
        const isBacktest = environment.backtest;
        this.storage = isBacktest ? new MemStorage(exchangeName, symbol) : new Storage(exchangeName, symbol);
        this.SignalResult = SignalResult;
        try {
            if (!this.indicatorBuilder.isBuilt()) {
                await this.indicatorBuilder.buildIndicators();
            }

            if (!this.exchangePair.setupDone) {
                await this.exchangePair.setup();
            }
        } catch (error) {
            this.logger.warn(`Indicator Period: Unable to kick start Period [${exchangeName}:${symbol}] (${error.message})`)
        }

    }

    getIndicator(name) {
        return this.indicatorBuilder.get(name);
    }

    async getLastPrice() {
        return (await this.exchangePair.getLastPrice());
    } 

    getLastSignal() {
        return this.exchangePair.getlastSignal()
    } 

    async getTicker() {
        return (await this.exchangePair.getTicker());
    }

    async getOrderBook () {
        return (await this.exchangePair.getOrderBook());
    }

    async getMarkPrice() {
        return (await this.exchangePair.getMarkPrice());
    }

    createSignal(signal, debug = {}) {
        return this.SignalResult.createSignal(signal, debug);
    }

    createEmptySignal(debug = {}) {
        return this.SignalResult.createEmptySignal(debug);
    }

    getTime() {
        return this.exchangePair.getTime();
    }

    getEnvironment() {
        return this.exchangePair.getEnvironment()
    }
    createAdvice(signal, price) {
        return this.SignalResult.createAdvice(signal, price)
    }

    async safetyBroadcast (price, side = 'LONG', type = 'stoploss') {
        const backtestKeyToAdd = (this.exchangePair.getEnvironment()).backtest === true ? ':bt': ''
        const key = `${side}:${type}${backtestKeyToAdd}`;
        await this.storage.set(key, {
            time: this.getTime(),
            side,
            type,
            price
        });
    }
    
    async getSafetyBroadcast (side, type) {
        const backtestKeyToAdd = (this.exchangePair.getEnvironment()).backtest === true ? ':bt': ''
        const key = `${side}:${type}${backtestKeyToAdd}`;
        const result = await this.storage.get(key);
        return result;
    }

    getExchangePairKey () {
        const symbol = this.symbol;
        const exchangeName = this.exchangeName;
        return `${exchangeName}:${symbol}`;
    }

}