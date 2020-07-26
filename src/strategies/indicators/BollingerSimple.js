const BB = require('technicalindicators').BollingerBands


module.exports = class {
    constructor(){}
    getName() {
        return 'bollingerSimple';
    }

    buildIndicators(indicatorBuilder, options) {
        indicatorBuilder.add('candles_5m', 'candles', {
            period: options.period,
            length : options.length + options.length
        })
    }

    async init(indicatorPeriod, options) {
        // Meant for prebuilding Indicator Strategies
        // And it only runs once
        // and u can make use of the indicatorPeriod.storage
        console.info(`Starting: ${indicatorPeriod.getTime()}`);
    }

    async period(indicatorPeriod, options) {
        try {
            const { length, period, stdDev} = options;
            const SignalResult = indicatorPeriod.SignalResult;
            const candles = indicatorPeriod.indicatorBuilder.get('candles_5m');
            candles.pop();
            const values = candles.map((val) => val.close);
            var input = {
                period: length - 1, 
                stdDev,
                values,
            }
            const res = BB.calculate(input)
            const resMiddle = res[res.length - 1]['middle'];
            const lastPrice = indicatorPeriod.getLastPrice();

            if(resMiddle  > lastPrice) {
                return SignalResult.createSignal('long', {
                    value: resMiddle
                })
            } else if (resMiddle  < lastPrice) {
                return SignalResult.createSignal('short', {
                    value: resMiddle
                })
            }
        } catch (error) {
             console.error(error);
        }
    }
    
    getOptions() {
        return {
            period: '5m',
            length: 14,
            stdDev: 2
        }
    }

}