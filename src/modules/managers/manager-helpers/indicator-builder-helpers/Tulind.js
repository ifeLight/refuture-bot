const tulind = require('tulind');

module.exports = class Candles {
    constructor({candlesRepository, exchange, symbol, logger, eventEmitter}) {
        this.candlesRepository = candlesRepository;
        this.exchange = exchange;
        this.symbol = symbol;
        this.logger = logger;
        this.eventEmitter = eventEmitter;
    }

    getName() {
        return 'tulind';
    }
    
    init(options) {
        this.candlesLength = options.length;
        this.options = options;
        this.name = options.name;
        this.indicatorOptions = options.options;

    }

    insideBuild(name, inputs, options) {
        return new Promise((resolve, reject) => {
            tulind.indicators[name].indicator(inputs, options, function(err, results) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
              });
        });
    }

    async build() {
        try {
            const { exchange, symbol, period, candlesLength, name, indicatorOptions} = this;
            const tulindIndicator = tulind.indicators[name];
            if (!tulindIndicator) throw new Error(`No tulind indicator with name: ${name}`);
            const length = parseInt(candlesLength);
            const candles = await this.candlesRepository.fetchCandlesByNumberFromNow({exchange, symbol, period, length});
            if (!candles) throw new Error('Unable to fetch candles')
            let res = {};
            res.close = candles.map(candle => candle.close);
            res.open = candles.map(candle => candle.open);
            res.low = candles.map(candle => candle.low);
            res.high = candles.map(candle => candle.high);
            res.volume = candles.map(candle => candle.volume);

            let indicatorInputs = []
            let indicatorResolvedOptions = [];
            if (tulindIndicator.inputs && tulindIndicator.inputs > 0) {
                for (const inputName of tulindIndicator['input_names']) {
                    if (inputName == 'real') {
                        indicatorInputs.push(res.close);
                        continue;
                    }
                    indicatorInputs.push(res[inputName]);
                }
            }
            
            if (tulindIndicator.options && tulindIndicator.options > 0) {
                for (let optionName of tulindIndicator['option_names']) {
                    const splittedOptionName = optionName.split(' ');
                    optionName = splittedOptionName.length  < 3 ? splittedOptionName[0] : splittedOptionName[1];
                    indicatorResolvedOptions.push(indicatorOptions[optionName]);
                }
            }

            const results = await this.insideBuild(name, indicatorInputs, indicatorResolvedOptions);
            return results;

        } catch (error) {
            this.logger.warn(`Tulind Builder: indicator builder Failed [${this.symbol}] (${error.message})`)
        }
    }
}