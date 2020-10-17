/***
 * It was designed for Testing
 */

const sma = require('technicalindicators').sma;
const rsi = require('technicalindicators').rsi;

module.exports = class {
    constructor(){}
    getName() {
        return 'long-test';
    }

    buildIndicators(indicatorBuilder, options) {
        const {period, length} = options;
        indicatorBuilder.add('candles', 'candles', {
            period,
            length
        })

    }

    async init(indicatorPeriod, options) {
        // Meant for prebuilding Indicator Strategies
        // And it only runs once
        // and u can make use of the indicatorPeriod.storage
    }

    async period(indicatorPeriod, options) {
        try {
            const lastPrice = indicatorPeriod.getLastPrice();
            const lastSignal = indicatorPeriod.getLastSignal();
            const candles = indicatorPeriod.indicatorBuilder.get('candles');
            return indicatorPeriod.createSignal('short');

        } catch (error) {
             console.error(error);
        }
    }
    
    getOptions() {
        return {
            period: '5m',
            length: 200
        }
    }

}