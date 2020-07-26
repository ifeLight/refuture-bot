module.exports = class Candles {
    constructor({candlesRepository, exchange, symbol, logger, eventEmitter, exchangeManager}) {
        this.candlesRepository = candlesRepository;
        this.exchange= exchange;
        this.symbol = symbol;
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.exchangeManager = exchangeManager;
    }

    getName() {
        return 'foreign_candles';
    }
    
    init(options) {
        this.period = options.period || '5m';
        this.foreignSymbol = options.symbol || 'BTC/USDT';
        this.exchangeName = options.exchange || 'binance';
        this.candlesLength = options.length || 200;
    }

    async build() {
        try {
            const { period, foreignSymbol, exchangeName, candlesLength} = this;
            const theExchange = this.exchangeManager.find(exchangeName);
            if (!theExchange) throw new Error('Exchange Name Invalid');
            const result = await this.candlesRepository.fetchCandlesByNumberFromNow({
                period,
                symbol: foreignSymbol,
                exchange: theExchange,
                length: parseInt(candlesLength)
            });
            return result;
        } catch (error) {
            this.logger(`Foreign Candle: Build Failed [${this.symbol}] (${error.message})`);
            return undefined;
        }
    }
}