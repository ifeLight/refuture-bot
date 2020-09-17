const TI = require('technicalindicators');
const tf = require('@tensorflow/tfjs-node');
const crossUp = TI.crossUp;
const crossDown =TI.crossDown

const periodToTimeDiff = require('../../utils/periodToTimeDiff');
const linearRegression = require('../../utils/calculations/linearRegression');

module.exports = class DenseNeural {
    /**
     * For a Simple Non Window Dense Neural Network
     */
    constructor() {}
    getName() {
        return 'simple-forecast-dense-neural';
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
            length : 200
        })
    }

    async period(indicatorPeriod, options) {
        try {
            const {period, modelFolder} = options
            const candles = indicatorPeriod.indicatorBuilder.get('candlesNeural');
            const lastCandle = candles[candles.length - 1]
            const timeLength = periodToTimeDiff(period);
            const timeDiff = (indicatorPeriod.getTime() - lastCandle.time) / timeLength;
            const onRightTime = timeDiff >= 0 && timeDiff < 0.5;

            if (onRightTime) {
                var fullCandles = candles;

                // Pop Last Candle
                var incompleteCandle = fullCandles.pop();

                // Create Indicators
                var rsi6 = this.buildSimpleIndicators(fullCandles, 'rsi', 6, 'close');
                var rsi14 = this.buildSimpleIndicators(fullCandles, 'rsi', 14, 'close');
                var sma9 = this.buildSimpleIndicators(fullCandles, 'sma', 9, 'close');
                var sma20 = this.buildSimpleIndicators(fullCandles, 'sma', 20, 'close');
                var sma100 = this.buildSimpleIndicators(fullCandles, 'sma', 100, 'close');

                // Add indicators to candles
                fullCandles = this.addToCandles(fullCandles, 'rsi6', rsi6)
                fullCandles = this.addToCandles(fullCandles, 'rsi14', rsi14)
                fullCandles = this.addToCandles(fullCandles, 'sma9', sma9)
                fullCandles = this.addToCandles(fullCandles, 'sma20', sma20)
                fullCandles = this.addToCandles(fullCandles, 'sma100', sma100)

                // Generate the last 10 close prices
                const lastTenClose = fullCandles.slice(fullCandles.length - 10, fullCandles.length).map((candle) => {
                    return candle.close;
                })

                // Last Eleven candles for Predictions
                var lastElevenCandles = fullCandles.slice(fullCandles.length - 11, fullCandles.length);

                //Convert Candles to Tensor Suitable Array
                var toArrayCandles = lastElevenCandles.map((candle) => {
                    const {
                        open, high, close, low, volume, rsi6, rsi14, sma9, sma20,sma100
                    } = candle;
                        open, high, close, low, volume, rsi6, rsi14, sma9, sma20,sma100
                    return [open, high, close, low, volume, rsi6, rsi14, sma9, sma20, sma100];
                })

                //Convert the Array to Input Tensor
                const inputTensor = tf.tensor(toArrayCandles, [11,1,10]);

                // Load the model & Predict
                const model = await tf.loadLayersModel(`file://./var/models/${modelFolder}/model.json`);
                const predsFloat32Array = model.predict(inputTensor).dataSync();
                const preds = Array.from(predsFloat32Array)

                // Pop out the next Prediction
                const nextPrediction = preds.pop();

                // The Last ten predictions
                const lastTenPreds = preds;

                // last close and prediction
                const lastClose = lastTenClose[lastTenClose.length - 1];
                const lastPrediction = lastTenPreds[lastTenPreds.length - 1];

                // Fetch slopes
                const actualPriceSlope = this.getSlope(lastTenClose);
                const actualPriceMiniSlope = this.getSlope(lastTenClose.slice(lastTenClose.length - 4, lastTenClose.length));
                const predictionSlope = this.getSlope(lastTenPreds);
                const predictionMiniSlope = this.getSlope(lastTenPreds.slice(lastTenPreds.length - 4, lastTenPreds.length));
                // console.log(this.getSlope([1,2,3,4,6,6,5,4]))

                const isRanging = (actualPriceSlope < 0.35) && (actualPriceSlope > -0.35);
                const isPredictionRanging = (predictionSlope < 0.35) && (predictionSlope > -0.35);

                // if (!isRanging && (lastClose > lastPrediction) && (nextPrediction < lastClose)) {
                //     return indicatorPeriod.createSignal('long', {
                //         nextPrediction,
                //         actualPriceSlope,
                //         predictionSlope
                //     });
                    
                // }

                // if (!isRanging && (lastClose < lastPrediction) && (nextPrediction > lastClose)) {
                //     return indicatorPeriod.createSignal('short', {
                //         nextPrediction,
                //         actualPriceSlope,
                //         predictionSlope
                //     });
                // }

                // if (isRanging && isPredictionRanging) {
                //     return indicatorPeriod.createSignal('close', {
                //         nextPrediction,
                //         actualPriceSlope,
                //         predictionSlope
                //     });
                // }


                // Tesing this
                // if (lastClose > lastPrediction) {
                //     return indicatorPeriod.createSignal('long');
                // }

                // if (lastClose < lastPrediction) {
                //     return indicatorPeriod.createSignal('short');
                // }


                const crossUpRes = crossUp({lineA: lastTenClose, lineB: lastTenPreds});
                const crossDownRes = crossDown({lineA: lastTenClose, lineB: lastTenPreds});

                if (crossUpRes[crossUpRes.length - 1]  && nextPrediction < lastClose) {
                    return indicatorPeriod.createSignal('long');
                }

                if (crossDownRes[crossDownRes.length - 1] && nextPrediction > lastClose) {
                    return indicatorPeriod.createSignal('short');
                }

               
                return indicatorPeriod.createEmptySignal({
                    nextPrediction,
                    actualPriceSlope,
                    predictionSlope
                })
                
            }
            return indicatorPeriod.createEmptySignal();
        } catch (error) {
            console.error(error)
            throw error;
        }
    }

    getSlope (data) {
        const reshapeData = data.map((value, index) => [index + 1, value])
        const res = linearRegression(reshapeData);
        return res.slope;
    }

    buildSimpleIndicators (candles, name, period, candleType = 'close') {
        var inputCandles = candles.map((candle) => candle[candleType]);
        var indicatorInput = { values: inputCandles, period };
        return TI[name](indicatorInput);
    }

    addToCandles (candles, name, data) {
        if (data.length > candles.length) throw new Error('Not compatible')
        var newData = candles.map((candle, index) => {
          var dataLength = data.length;
          var candlesLength = candles.length;
          var dt;
          var diffLength = candlesLength - dataLength;
          if (index < diffLength) {
            dt = null;
          } else {
            dt = data[index - diffLength]
          }
          return {...candle, [name]: dt}
        })
        return newData;
      }

    filterNullValues (candles) {
    var filtered = candles.filter((candle) => {
        var values = Object.values(candle);
        for (var val of values) {
        if (val === undefined || val === null || val === "") {
            return false;
        }
        }
        return true;
    })
    return filtered;
    }
  

    getOptions() {
        return {
            period: '5m',
            modelFolder: 'fdnBinanceFuturesBTCUSDT',
        }
    }

}