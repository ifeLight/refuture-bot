const technicalindicators = require('technicalindicators');
const tf = require('@tensorflow/tfjs-node');

const periodToTimeDiff = require('../../utils/periodToTimeDiff');

module.exports = class DenseNeural {
    /**
     * For a Simple Non Window Dense Neural Network
     */
    constructor() {}
    getName() {
        return 'dense-neural';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
        // Load model
        // const model =  await tf.loadLayersModel('../../../var/models/BTC')
        //await storage.set('btc_dense_neural_model', model);
    }

    buildIndicators(indicatorBuilder, options) {
        indicatorBuilder.add('candlesNeural', 'candles', {
            period: options.period,
            length : options.space
        })
    }

    async period(indicatorPeriod, options) {
        try {
            const {period, modelFolder, normalization } = options
            const candles = indicatorPeriod.indicatorBuilder.get('candlesNeural');

            const lastCandle = candles[candles.length - 1];
            const prevCandle = candles[candles.length - 2];
            const {time, open, high, close, low, volume } = prevCandle;
            const timeLength = periodToTimeDiff(period);
            const timeDiff = (indicatorPeriod.getTime() - lastCandle.time) / timeLength;
            const onRightTime = timeDiff >= 0 && timeDiff < 0.5;

            if (onRightTime) {
                //Normalization of previous Candle
                const timeNorm = time / normalization.time;
                const openNorm = open / normalization.open;
                const highNorm = high / normalization.high;
                const closeNorm = close / normalization.close;
                const lowNorm = low / normalization.low;
                const volumeNorm = volume / normalization.volume;
                const inputTensor = tf.tensor2d([timeNorm, openNorm, highNorm, closeNorm, lowNorm, volumeNorm], [1,6], 'float32');
                const model =  await tf.loadLayersModel(`file://./var/models/${modelFolder}/model.json`);
                const pred = model.predict(inputTensor);
                const predDirection =  (pred.argMax(1).dataSync())[0];
                if (predDirection > 0) {
                    console.log(predDirection)
                }
                if (predDirection === 0) {
                    return indicatorPeriod.createSignal('close', {
                        ...prevCandle
                    });
                } else if (predDirection === 1) {
                    return indicatorPeriod.createSignal('long', {
                        ...prevCandle
                    });
                } else if (predDirection === 2) {
                    return indicatorPeriod.createSignal('short', {
                        ...prevCandle
                    });
                }
            }
            return indicatorPeriod.createEmptySignal();
        } catch (error) {
            console.error(error)
        }
    }

    getOptions() {
        return {
            period: '5m',
            modelFolder: 'BTC',
            normalization: {
                time: 10000000000000,
                open: 50000,
                high: 50000,
                close: 50000,
                low: 50000,
                volume: 50000,
            }
        }
    }

}