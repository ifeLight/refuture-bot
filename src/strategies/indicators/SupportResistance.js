const { 
    BollingerBands, sma, rsi,
    ema, adx, macd,
    bullishengulfingpattern, bullishhammerstick,
    tweezerbottom, tweezertop,
    shootingstar, threeblackcrows,
    threewhitesoldiers, bearishengulfingpattern,
    abandonedbaby, eveningdojistar,
} = require('technicalindicators');

const TI = require('technicalindicators');

const linearRegression = require('../../utils/calculations/linearRegression');
const getPivots = require('../../utils/calculations/getPivots');
const generateLines = require('../../utils/generateLines');
const periodToTimeDiff = require('../../utils/periodToTimeDiff');

module.exports = class {
    constructor(){}
    getName() {
        return 'support-resistance';
    }

    buildIndicators(indicatorBuilder, options) {
        const { period, length } = options;
        indicatorBuilder.add('candles', 'candles', {
            period,
            length
        });
    }

    async init(indicatorPeriod, options) {
        // Meant for prebuilding Indicator Strategies
        // And it only runs once
        // and u can make use of the indicatorPeriod.storage
    }

    async period(indicatorPeriod, options) {
        try {
            const { period: candlePeriod, length, longRSI, shortRSI, useRSI, candleDepth} = options;
            this.options = options;
            this.longRSI = longRSI;
            this.shortRSI = shortRSI,
            this.useRSI = useRSI;
            this.indicatorPeriod = indicatorPeriod;
            this.candlePeriod = candlePeriod;
            
            const lastPrice = await indicatorPeriod.getLastPrice();
            const lastSignal = indicatorPeriod.getLastSignal();
            const presentTime = indicatorPeriod.getTime();
            const candles = indicatorPeriod.indicatorBuilder.get('candles');

            // console.log('-----Candles Length-----');
            // console.log(candles.length)

            // Only allow this indicator to run 
            // At the early stage of the candle
            const lastCandle = candles[candles.length - 1]
            const timeLength = periodToTimeDiff(candlePeriod);
            const timeDiff = (presentTime - lastCandle.time) / timeLength;
            const inExtraTime = (presentTime - lastCandle.time) >= timeLength;
            const extraTimeInSecs = (presentTime - (lastCandle.time + timeLength)) / 1000;
            // Run at Early Time - and for some lapses at next time due to unavailable present candle
            const onRightTime = (timeDiff >= 0 && timeDiff < 0.35) || (timeDiff >= 1 && timeDiff <= 1.35); //at most quarter time of the candle
            if (!onRightTime) return indicatorPeriod.createEmptySignal();

            //Remove the last incomplete candle
            let incompleteCandle;
            if (!this.isLastCandleComplete(candles, presentTime)) {
                incompleteCandle = candles.pop();
            }

            //Lines generator configuration
            this.generateLinesConfig = {
                candles, candleDepth, 
                maxLines: 5, 
                lineAllowancePercentage: 0.1, 
                priceLineDiffPercentage: 2
            }
            
            return this.calculateSignal(candles);

        } catch (error) {
            console.error(error);
             throw error;
        }
    }

    async storePrice(price) {
        const key = `${this.candlePeriod}`;
        await this.indicatorPeriod.storage.set(key, price);
    }

    async getPrice() {
        const key = `${this.candlePeriod}`;
        const price = await this.indicatorPeriod.storage.get(key);
        return price;
    }

    rsiCrossoverCheck(candles, signal = 'long') {
        // signal can be long or short
        // The RSI will check for a last value bullish sign
        const {shortRSI, longRSI} = this.options;
        const theClosePrices = candles.map((candle) => candle.close);
        const longInput = {
            values: theClosePrices,
            period: longRSI
        }
        const shortInput = {
            values: theClosePrices,
            period: shortRSI
        }
        const longResult = rsi(longInput);
        const shortResult = rsi(shortInput);
        const longLastValue = longResult[longResult.length - 1]
        const shortLastValue = shortResult[shortResult.length - 1]
        if (signal === 'long') return shortLastValue > longLastValue;
        if (signal === 'short') return shortLastValue < longLastValue;
        return false;
    }

    emaCrossOverCheck(candles, signal = 'long') {
        const theClosePrices = candles.map((candle) => candle.close);
        const {shortEMA, longEMA} = this.options;
        const longInput = {
            values: theClosePrices,
            period: longEMA
        }
        const shortInput = {
            values: theClosePrices,
            period: shortEMA
        }
        const longResult = ema(longInput);
        const shortResult = ema(shortInput);
        const longLastValue = longResult[longResult.length - 1]
        const shortLastValue = shortResult[shortResult.length - 1]
        if (signal === 'long') return shortLastValue > longLastValue;
        if (signal === 'short') return shortLastValue < longLastValue;
        return false;
    }

    emaCrossOverCheck2(candles, signal = 'long') {
        const theClosePrices = candles.map((candle) => candle.close);
        const {shortEMA2, longEMA2} = this.options;
        const longInput = {
            values: theClosePrices,
            period: longEMA2
        }
        const shortInput = {
            values: theClosePrices,
            period: shortEMA2
        }
        const longResult = ema(longInput);
        const shortResult = ema(shortInput);
        const longLastValue = longResult[longResult.length - 1]
        const shortLastValue = shortResult[shortResult.length - 1]
        if (signal === 'long') return shortLastValue > longLastValue;
        if (signal === 'short') return shortLastValue < longLastValue;
        return false;
    }

    smaCrossOverCheck (candles, signal = 'long') {
        const theClosePrices = candles.map((candle) => candle.close);
        const {shortSMA, longSMA} = this.options;
        const longInput = {
            values: theClosePrices,
            period: longSMA
        }
        const shortInput = {
            values: theClosePrices,
            period: shortSMA
        }
        const longResult = sma(longInput);
        const shortResult = sma(shortInput);
        const longLastValue = longResult[longResult.length - 1]
        const shortLastValue = shortResult[shortResult.length - 1]
        if (signal === 'long') return shortLastValue > longLastValue;
        if (signal === 'short') return shortLastValue < longLastValue;
        return false;
    }

    macdCrossoverCheck (candles, signal = 'long') {
        const {fastMACD, slowMACD, signalMACD} = this.options;
        const theClosePrices = candles.map((candle) => candle.close);
        const input = {
            values: theClosePrices,
            fastPeriod: fastMACD,
            slowPeriod: slowMACD,
            signalPeriod: signalMACD,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        }
        const res = macd(input);
        const lastValue = res[res.length - 1];
        // console.log(lastValue)
        // console.log('-----------')
        if (signal === 'long') return lastValue.signal > lastValue.MACD;
        if (signal === 'short') return lastValue.signal < lastValue.MACD;
        return false;
    }

    adxBeyond(candles) {
        const {ADXPeriod, ADXTrend} = this.options;
        let input = this.generateCandlesticksInputs(candles);
        input = {...input, period:ADXPeriod}
        const results = adx(input);
        const lastResult = results[results.length - 1];
        if (lastResult.adx >= ADXTrend) {
            return true;
        } else {
            return false;
        }
    }

    indicatorFilterCheck (candles, signal = 'long') {
        const {indicatorFilterPeriod, indicatorFilter} = this.options;
        const lastCandle = candles[candles.length - 1];
        const theClosePrices = candles.map((candle) => candle.close);
        const input = {
            values: theClosePrices,
            period: Number(indicatorFilterPeriod)
        }
        const indicator = TI[indicatorFilter];
        const result = indicator(input);
        const lastResult = result[result.length - 1];
        if (signal == 'long'){
            return lastCandle.close > lastResult;
        }
        if (signal == 'short'){
            return lastCandle.close < lastResult;
        }
        return false;
    } 

    // TODO - EMA, SMA, ADX advancing
    smaAdvancing() {

    }

    emaAdvancing() {

    }

    adxAdvancing() {

    }

    isLastCandleComplete(candles, presentTime) {
        const candle1Time = candles[candles.length - 2].time;
        const candle2Time = candles[candles.length - 3].time
        const normalPeriodTimeDiff = Math.abs(candle1Time - candle2Time);
        const lastCandleTime = candles[candles.length - 1].time;
        const lastCandleDiff = Math.abs(presentTime - lastCandleTime)
        if ((lastCandleDiff + 50) < normalPeriodTimeDiff){ //adding 50ms;not a bug
            return false;
        }
        return true;
    }

    getRecommendedStopLoss (candles, price, signal) {
        const { recommendedStoplossStep } = this.options;
        const averageHeight = this.getAverageHeight(candles);
        if (signal === 'short') {
            return price + (recommendedStoplossStep * averageHeight);
        }
        if (signal === 'long') {
            return price - (recommendedStoplossStep * averageHeight);
        }
    }

    getRecommendedTakeProfit (candles, price, signal) {
        const { recommendedTakeProfitStep } = this.options;
        const averageHeight = this.getAverageHeight(candles);
        if (signal === 'short') {
            return price + (recommendedTakeProfitStep * averageHeight);
        }
        if (signal === 'long') {
            return price - (recommendedTakeProfitStep * averageHeight);
        }
    }

    isCandleDirection(candle, direction = 'long') {
        const {open, close} = candle;
        if (direction == 'long') {
            return parseFloat(close) >= parseFloat(open);
        }
        if (direction == 'short') {
            return parseFloat(close) <= parseFloat(open);
        }
        return false;
    }

    calculateCandleStickPattern(candles) {
        const lastCandle = this.generateCandlesticksInputs(candles, 1)
        const lastTwoCandles = this.generateCandlesticksInputs(candles, 2);
        const lastThreeCandles = this.generateCandlesticksInputs(candles, 3);
        const lastFiveCandles = this.generateCandlesticksInputs(candles, 5);

        //Bullish Pattren
        this.bullishengulfingpattern = bullishengulfingpattern(lastTwoCandles);
        this.threewhitesoldiers = threewhitesoldiers(lastThreeCandles);
        this.tweezerbottom = tweezerbottom(lastFiveCandles);
        this.bullishhammerstick = bullishhammerstick(lastCandle);
        this.abandonedbaby = abandonedbaby(lastThreeCandles);

        //Bearish Pattern
        this.bearishengulfingpattern = bearishengulfingpattern(lastTwoCandles);
        this.threeblackcrows = threeblackcrows(lastThreeCandles);
        this.tweezertop = tweezertop(lastFiveCandles);
        this.shootingstar = shootingstar(lastFiveCandles);
        this.eveningdojistar = eveningdojistar(lastThreeCandles)

    }

    isBullishPatternFormed(candles) {
        this.calculateCandleStickPattern(candles)
        const lastCandle = candles[candles.length - 1]
        const isDirectionLong = this.isCandleDirection(lastCandle);
        const cond1 = this.bullishengulfingpattern || this.threewhitesoldiers ;
        const cond2 = this.bullishhammerstick || this.abandonedbaby;
        return (cond1 || cond2) && isDirectionLong;
    }

    isBearishPatternFormed(candles) {
        this.calculateCandleStickPattern(candles);
        const lastCandle = candles[candles.length - 1]
        const isDirectionShort = this.isCandleDirection(lastCandle, 'short');
        const cond1 = this.bearishengulfingpattern || this.threeblackcrows ;
        const cond2 = this.shootingstar || this.eveningdojistar;
        return (cond1 || cond2) && isDirectionShort;
    }
    

    generateCandlesticksInputs(candles, length) {
        const retouchedCandles = {open: [], close: [], high: [], volume: [], low: []};
        const startingPoint = length && (length < candles.length) ? candles.length - length: 0;
        for (let x = startingPoint; x < candles.length; x++) {
            const { open, high, close, low, volume } = candles[x];
            retouchedCandles.open.push(open);
            retouchedCandles.close.push(close);
            retouchedCandles.high.push(high);
            retouchedCandles.low.push(low);
            retouchedCandles.volume.push(volume);
        }
        return retouchedCandles;
    }

    getAverageHeight(candles) {
        const heights = candles.map(candle => (Math.abs(candle.high - candle.low)));
        const averageHeight = heights.reduce((pre, total) => (total + pre)) / heights.length;
        return averageHeight;
    }

    lastCandleAboveLine(price, candles) {
        const candle = Array.isArray(candles) ? candles[candles.length -1] : candles;
        return candle.open > price && candle.close > price;
    }

    lastCandleBelowLine(price, candles) {
        const candle = Array.isArray(candles) ? candles[candles.length -1] : candles;
        return candle.open < price && candle.close < price;
    }

    async calculateSignal(candles) {
        const {onlyReversal: onlyReversalConfig, onlyRebounce: onlyRebounceConfig} = this.options;
        //Last Five Candles
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        // Fetch Active lower and upper lines
        let lowerLine, upperLine, generatedLines;
        let fetchedLowerLine = await this.getLine('lower');
        let fetchedUpperLine = await this.getLine('upper');
        const generateLinesConfig = this.generateLinesConfig;

        const onlyReversal = onlyReversalConfig === true;
        const onlyRebounce = onlyRebounceConfig === true;
        

        if (!fetchedUpperLine || !fetchedLowerLine) {
            generatedLines = generateLines(generateLinesConfig);
            if (!fetchedUpperLine) {
                upperLine = fetchedUpperLine ? fetchedUpperLine : generatedLines.upperLines[0]
            }
            if (!fetchedLowerLine) {
                lowerLine = fetchedLowerLine ? fetchedLowerLine : generatedLines.lowerLines[0];
            }
            // Store Lines if available
            if (lowerLine) {
                await this.storeLine(lowerLine, 'lower')
            }
            if (upperLine) {
                await this.storeLine(upperLine, 'upper')
            }
        } else {
            lowerLine = fetchedLowerLine;
            upperLine = fetchedUpperLine;
        }

        const signalInUpperLineLong = upperLine && this.upperLineLongCheck(upperLine, candles);
        const signalInUpperLineShort = upperLine && this.upperLineShortCheck(upperLine, candles);
        const signalInLowerLineLong = lowerLine && this.lowerLineLongCheck(lowerLine, candles);
        const signalInLowerLineShort = lowerLine && this.lowerLineShortCheck(lowerLine, candles);
        const toRunLong = this.toRun(candles, 'long');
        const toRunShort = this.toRun(candles, 'short');

        // console.log(`To run long; ${toRunLong}`);
        // console.log(`To run short; ${toRunShort}`);
        // console.log('------------------')

        //Checking to Buy long on Upper Line
        if (signalInUpperLineLong && toRunLong && !onlyRebounce) {
            let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, upperLine, 'long');
            await this.indicatorPeriod.safetyBroadcast(recommendedStoploss, 'LONG', 'stoploss')
            return this.indicatorPeriod.createSignal('long', {
                signalInUpperLineLong,
                stoplossRecommended : recommendedStoploss
            });
        }

        // Checking To buy Short on UpperLine
        if (signalInUpperLineShort && toRunShort && !onlyReversal) {
            let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, upperLine, 'short');
            await this.indicatorPeriod.safetyBroadcast(recommendedStoploss, 'SHORT', 'stoploss')
            return this.indicatorPeriod.createSignal('short', {
                signalInUpperLineShort,
                stoplossRecommended : recommendedStoploss
            });
        }


        //Checking to Buy long on Lower Line
        if (signalInLowerLineLong  && toRunLong && !onlyReversal) {
            let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, lowerLine, 'long');
            await this.indicatorPeriod.safetyBroadcast(recommendedStoploss, 'LONG', 'stoploss')
            return this.indicatorPeriod.createSignal('long', {
                signalInLowerLineLong,
                stoplossRecommended : recommendedStoploss
            });
        }

        // Checking To buy Short on LowerLine
        if (signalInLowerLineShort && toRunShort && !onlyRebounce) {
            let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, lowerLine, 'short');
            await this.indicatorPeriod.safetyBroadcast(recommendedStoploss, 'SHORT', 'stoploss')
            return this.indicatorPeriod.createSignal('short', {
                signalInLowerLineShort,
                stoplossRecommended : recommendedStoploss
            });
        }

        if (!signalInLowerLineLong && !signalInLowerLineShort) {
            // Check the Validity of the lowerLine
            const stillValid = this.lineValidityCheck(lowerLine, lastFiveCandles);
            if (!stillValid || !lowerLine) {
                generatedLines = generateLines(generateLinesConfig);
                if (generatedLines.lowerLines[0]) {
                    lowerLine = generatedLines.lowerLines[0];
                    await this.storeLine(lowerLine, 'lower')
                }
            }
        }

        if (!signalInUpperLineLong && !signalInUpperLineShort) {
            // Check the Validity of the upperLine
            const stillValid = this.lineValidityCheck(upperLine, lastFiveCandles);
            if (!stillValid || !upperLine) {
                generatedLines = generateLines(generateLinesConfig);
                if (generatedLines.upperLines[0]) {
                    upperLine = generatedLines.upperLines[0];
                    await this.storeLine(upperLine, 'upper');
                }
            }
        }

        // Return Empty, when no Signal Generated
        return this.indicatorPeriod.createEmptySignal();

    }

    toRun(candles, signal = 'long') {
        const {useSMACrossover, useRSI, useEMACrossover, useIndicatorFilter, useADX, useMACD, useEMACrossover2} = this.options;
        if (useRSI === true) {
            if(!this.rsiCrossoverCheck(candles, signal)) return false;
        }
        if (useSMACrossover === true) {
            if(!this.smaCrossOverCheck(candles, signal)) return false;
        }
        if (useEMACrossover === true) {
            if(!this.emaCrossOverCheck(candles, signal)) return false;
        }
        if (useADX === true) {
            if(!this.adxBeyond(candles)) return false;
        }

        if (useIndicatorFilter === true) {
            if(!this.indicatorFilterCheck(candles, signal)) return false;
        }

        if (useMACD === true) {
            // console.log(`Signal: ${signal} - status: ${this.macdCrossoverCheck(candles, signal)}`);
            // console.log('---------------');
            // console.log('------------------')
            if(!this.macdCrossoverCheck(candles, signal)) return false;
        }

        if (useEMACrossover2 === true) {
            if(!this.emaCrossOverCheck2(candles, signal)) return false;
        }
        return true;
    }
    
    getOptions() {
        return {
            period: '5m',
            candleDepth: 5,
            candleSizeDiff: 1,
            minMatch: 1,
            length: 100,
            longRSI: 14,
            shortRSI: 6,
            useRSI: true,
            shortSMA: 9,
            longSMA: 20,
            useSMACrossover: false,
            shortEMA: 5,
            longEMA: 20,
            useEMACrossover: false,
            shortEMA2: 5,
            longEMA2: 20,
            useEMACrossover2: false,
            fastMACD: 12,
            slowMACD: 26,
            signalMACD: 9,
            useMACD: false,
            ADXPeriod: 14,
            ADXTrend: 25,
            useADX: false,
            useSMAAdvancing: false,
            useEMAAdvancing: false,
            useADXAdvancing: false,
            onlyReversal: false,
            onlyRebounce: false,
            recommendedStoplossStep: 2,
            recommendedTakeProfitStep: 5,
            useIndicatorFilter: false, // Use an Indicator like the sma to filter out Some signals
            indicatorFilterPeriod: 60,
            indicatorFilter: 'ema',
        }
    }

}