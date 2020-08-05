/***
 * It was designed for Testing
 * Failed badly
 */

const crossDown = require('technicalindicators').crossDown;
const crossUp = require('technicalindicators').crossUp;
const rsi = require('technicalindicators').rsi;

module.exports = class {
    constructor(){}
    getName() {
        return 'rsiSimple';
    }

    buildIndicators(indicatorBuilder, options) {
        const {period, long, short} = options;
        const length = parseInt(options.length + parseInt(long));
        indicatorBuilder.add('candles', 'candles', {
            period,
            length
        })

        /**
         * It ran slow during Backtesting
         * Under debugging
         */
        // indicatorBuilder.add('rsi_long', 'tulind', {
        //     period,
        //     length,
        //     name: 'rsi',
        //     options: {
        //         period: long
        //     }
        // });
        // indicatorBuilder.add('rsi_short', 'tulind', {
        //     period,
        //     length,
        //     name: 'rsi',
        //     options: {
        //         period: short
        //     }
        // });
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
            const { long, short } = options;
            const candles = indicatorPeriod.indicatorBuilder.get('candles');
            // const rsiLong = indicatorPeriod.indicatorBuilder.get('rsi_long')[0];
            // const rsiShort = indicatorPeriod.indicatorBuilder.get('rsi_short')[0];

            const retouchedCandles = {open: [], close: [], high: [], volume: [], low: []};
            candles.forEach(candle => {
                const { open, high, close, low, volume } = candle;
                retouchedCandles.open.push(open);
                retouchedCandles.close.push(close);
                retouchedCandles.high.push(high);
                retouchedCandles.low.push(low);
                retouchedCandles.volume.push(volume);
            });

            const shortInput = {
                values: retouchedCandles.close,
                period: parseInt(short)
            }
            const longInput = {
                values: retouchedCandles.close,
                period: parseInt(long)
            }

            const rsiLong = rsi(longInput);
            const rsiShort = rsi(shortInput);

            const reducedRsiLong = rsiLong.slice(-8);
            const reducedRsiShort = rsiShort.slice(-8);
            const lineA = reducedRsiShort;
            const lineB = reducedRsiLong;
            const input = {lineA, lineB};
            const crossedUp = crossUp(input);
            const crossedDown = crossDown(input);
            const crossedUpCheck = crossedUp[crossedUp.length - 2];
            const crossedDownCheck = crossedDown[crossedDown.length - 2];

            if (crossedUpCheck) {
                if (lastSignal && lastSignal == 'long') return;
                return indicatorPeriod.createSignal('long');
            } 

            if(crossedDownCheck) {
                if (lastSignal && lastSignal == 'short') return;
                return indicatorPeriod.createSignal('short');
            }

            return indicatorPeriod.createEmptySignal();

        } catch (error) {
             console.error(error);
        }
    }
    
    getOptions() {
        return {
            period: '5m',
            length: 14,
            long: 14,
            short: 6
        }
    }

}