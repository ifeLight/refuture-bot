module.exports = class Candles {
    constructor({candlesRepository, exchange, symbol, logger, eventEmitter}) {
        this.candlesRepository = candlesRepository;
        this.exchange = exchange;
        this.symbol = symbol;
        this.logger = logger;
        this.eventEmitter = eventEmitter;
    }

    getName() {
        return 'pivots';
    }
    
    init(options) {
        this.period = options.period;
        this.candlesLength = options.length || 200;
        this.depth = options.depth || 5;
    }

    async build() {
        try {
            const { exchange, symbol, period, candlesLength, depth} = this;
            const length = parseInt(candlesLength);
            const candles = await this.candlesRepository.fetchCandlesByNumberFromNow({exchange, symbol, period, length});
            const pivots = this.getPivots(candles, depth);
            return pivots;
        } catch (error) {
            this.logger.info(`${this.getName()} Builder: indicator builder Failed [${this.symbol}] (${error.message})`);
            return undefined;
        }
    }

    getPivots(candles, depth= 5) {
        const highCandles = [];
        const lowCandles = [];

        for (let index = 0; index < candles.length - (depth + 1); index++) {
            if (index <= depth) continue;
            const rightCandle = candles[index - 1];
            const farRightCandle = candles[index - 2];
            const leftCandle = candles[index + 1];
            const farLeftCandle = candles[index + 2];
            const candle = candles[index];

            //Asuming they are highcandle and low candle
            let highCandleBoolean = true;
            let lowCandleBoolean = true;

            // For High && Low candle detection
            // left Check
            for (let i = 1; i <= depth; i++) {
                const toCheckLeftCandle = candles[index + i];
                const toCheckRightCandle = candles[index - i];
                
                //Checking if it is still a high Candle
                if (Number(candle.high) < Number(toCheckLeftCandle.high) || Number(candle.high) < Number(toCheckRightCandle.high)) {
                    highCandleBoolean = false;
                }
                //Checking wether if its still a low candle
                if (Number(candle.low) > Number(toCheckLeftCandle.low) || Number(candle.low) > Number(toCheckRightCandle.low)) {
                    lowCandleBoolean = false;
                }
                if (!highCandleBoolean && !lowCandleBoolean) break;
            }
            // const highCandleBoolean = (Number(rightCandle.high) < Number(candle.high)) && (Number(leftCandle.high) < Number(candle.high)) && (Number(farRightCandle.high) < Number(candle.high)) && (Number(farLeftCandle.high) < Number(candle.high))
            // const lowCandleBoolean = (Number(rightCandle.low) > Number(candle.low)) && (Number(leftCandle.low) > Number(candle.low)) && (Number(farLeftCandle.low) > Number(candle.low)) && (Number(farRightCandle.low) > Number(candle.low))
            if (highCandleBoolean) {
                highCandles.push(candle);
            }
            if (lowCandleBoolean) {
                lowCandles.push(candle);
            }
        }
        return {
            high: highCandles,
            low: lowCandles
        }
    }
}