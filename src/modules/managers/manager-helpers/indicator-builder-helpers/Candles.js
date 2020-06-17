module.exports = class Candles {
    constructor({candlesRepository, exchange, symbol, logger, eventEmitter}) {
        this.candlesRepository = candlesRepository;
        this.exchange = exchange;
        this.symbol = symbol;
        this.logger = logger;
        this.eventEmitter = eventEmitter;
    }

    getName() {
        return 'candles';
    }
    
    init(options) {
        this.period = options.period
        this.candlesLength = options.length || 200;

    }

    async build() {
        try {
            this.candlesRepository.init(this.exchange, this.symbol, this.period);
            const result = await this.candlesRepository.fetchCandlesByNumberFromNow(parseInt(this.candlesLength));
            return result;
        } catch (error) {
            this.logger.info(`${this.getName()} Builder: indicator builder Failed [${this.symbol}] (${error.message})`);
            return undefined;
        }
    }
}