/***
 * It was designed for Testing
 */

const sma = require('technicalindicators').sma;
const rsi = require('technicalindicators').rsi;

module.exports = class {
    constructor(){}
    getName() {
        return 'smaRsi';
    }

    buildIndicators(indicatorBuilder, options) {
        const {period, smaLong} = options;
        const length = parseInt(options.length + parseInt(smaLong));
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
            const { smaLong, smaShort, rsiLong, rsiShort } = options;
            const candles = indicatorPeriod.indicatorBuilder.get('candles');

            const retouchedCandles = {open: [], close: [], high: [], volume: [], low: []};
            candles.forEach(candle => {
                const { open, high, close, low, volume } = candle;
                retouchedCandles.open.push(open);
                retouchedCandles.close.push(close);
                retouchedCandles.high.push(high);
                retouchedCandles.low.push(low);
                retouchedCandles.volume.push(volume);
            });

            const shortRsiInput = {
                values: retouchedCandles.close,
                period: parseInt(rsiShort)
            }
            const longRsiInput = {
                values: retouchedCandles.close,
                period: parseInt(rsiLong)
            }

            const shortSmaInput = {
                values: retouchedCandles.close,
                period: parseInt(smaShort)
            }
            const longSmaInput = {
                values: retouchedCandles.close,
                period: parseInt(smaLong)
            }
            
            const rsiLongList = rsi(longRsiInput);
            const rsiShortList = rsi(shortRsiInput);
            const smaLongList = sma(longSmaInput);
            const smaShortList = sma(shortSmaInput);

            const rsiLongCheck = rsiLongList[rsiLongList.length - 2];
            const rsiShortCheck = rsiShortList[rsiShortList.length - 2];
            const smaLongCheck = smaLongList[smaLongList.length - 2];
            const smaShortCheck = smaShortList[smaShortList.length - 2];

            const longCheck = rsiShortCheck > rsiLongCheck && smaShortCheck > smaLongCheck;
            const shortCheck = rsiShortCheck < rsiLongCheck && smaShortCheck < smaLongCheck;

            if (longCheck) {
                if (lastSignal && lastSignal == 'long') return;
                return indicatorPeriod.createSignal('long');
            } 

            if(shortCheck) {
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
            rsiLong: 14,
            rsiShort: 6,
            smaLong: 20,
            smaShort: 9
        }
    }

}