/***
 * It was designed for Testing
 * Its a Failed Indicator
 */

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

            const lastSignal = indicatorPeriod.getLastSignal();

            if(resMiddle  > lastPrice) {
                if(lastSignal == 'long') return indicatorPeriod.createEmptySignal();
                return SignalResult.createSignal('long', {
                    value: resMiddle
                })
            } else if (resMiddle  < lastPrice) {
                if(lastSignal == 'short') return indicatorPeriod.createEmptySignal();
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