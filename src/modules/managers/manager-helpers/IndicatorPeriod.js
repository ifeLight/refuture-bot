const SignalResult = require('../../../classes/SignalResult');
const Storage = require('../../../classes/Storage');

module.exports = class IndicatorPeriod {
    constructor (logger) {
        this.logger = logger
    }
    async setup (exchangePair, indicatorBuilder) {
        this.exchangePair = exchangePair;
        this.indicatorBuilder = indicatorBuilder;
        const { exchangeName, symbol } = exchangePair
        this.storage = new Storage(exchangeName, symbol);
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

    getLastPrice() {
        return this.exchangePair.getLastPrice();
    } 

    getLastSignal() {
        return this.exchangePair.getlastSignal()
    } 

    getTicker() {
        return this.exchangePair.getTicker();
    }

    getOrderBook () {
        return this.exchangePair.getOrderBook();
    }

    getMarkPrice() {
        return this.exchangePair.getMarkPrice();
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

    async safetyBroadCast (price, side = 'long', type = 'stoploss') {
        const backtestKeyToAdd = (this.getEnvironment()).backtest === true ? ':bt': ''
        const key = `${side}:${type}${backtestKeyToAdd}`;
        await this.storage.set(key, {
            time: this.getTime(),
            side,
            type,
            price
        });
    }
    
    async getSafetyBroadcast () {
        const backtestKeyToAdd = (this.exchangePair.getEnvironment()).backtest === true ? ':bt': ''
        const key = `${side}:${type}${backtestKeyToAdd}`;
        const result = await this.storage.get(key);
        return result;
    }

    getExchangePairKey () {
        const symbol = this.symbol,
        const exchangeName = this.exchangeName;
        return `${exchangeName}:${symbol}`;
    }

}