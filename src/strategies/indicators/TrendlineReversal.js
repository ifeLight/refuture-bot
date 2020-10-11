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
        return 'trendline-reversal';
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
            const { period: candlePeriod, length, longRSI, shortRSI, useRSI} = options;
            this.options = options;
            this.longRSI = longRSI;
            this.shortRSI = shortRSI,
            this.useRSI = useRSI;
            this.indicatorPeriod = indicatorPeriod;
            this.candlePeriod = candlePeriod;
            
            const lastPrice = indicatorPeriod.getLastPrice();
            const lastSignal = indicatorPeriod.getLastSignal();
            const presentTime = indicatorPeriod.getTime();
            const candles = indicatorPeriod.indicatorBuilder.get('candles');

            //Lines generator configuration
            this.generateLinesConfig = {
                candles, candleDepth: 5, 
                maxLines: 5, 
                lineAllowancePercentage: 0.1, 
                priceLineDiffPercentage: 2
            }

            // Only allow this indicator to run 
            // At the early stage of the candle
            const lastCandle = candles[candles.length - 1]
            const timeLength = periodToTimeDiff(candlePeriod);
            const timeDiff = (indicatorPeriod.getTime() - lastCandle.time) / timeLength;
            const onRightTime = timeDiff >= 0 && timeDiff < 0.35; //at most quarter time of the candle
            if (!onRightTime) return indicatorPeriod.createEmptySignal();

            //Remove the last incomplete candle
            let incompleteCandle;
            if (!this.isLastCandleComplete(candles, presentTime)) {
                incompleteCandle = candles.pop();
            }
            return this.calculateSignal(candles);

        } catch (error) {
             throw error;
        }
    }

    async storeLine(line, type) {
        //type can be 'lower' or 'upper'
        const key = `${this.candlePeriod}_${type}`;
        await this.indicatorPeriod.storage.set(key, line);
    }

    async getLine(type) {
        const key = `${this.candlePeriod}_${type}`;
        const line = await this.indicatorPeriod.storage.get(key);
        return line;
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
            period: number(indicatorFilterPeriod)
        }
        const indicator = technicalindicators[indicatorFilter];
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

    getSlopeFromRegression (candles, candleType = 'close') {
        const reCandleMap = candles.map((candle) => [candle.time, candle[candleType]]);
        const res = linearRegression(reCandleMap);
        return res.slope;
    }

    getRecommendedStopLoss (candles, line, signal) {
        const { recommendedStoplossStep } = this.options;
        const averageHeight = this.getAverageHeight(candles);
        const priceEnd = this.getPriceFromLine(line, candles[candles.length - 1].time);
        if (signal === 'short') {
            return priceEnd + (recommendedStoplossStep * averageHeight);
        }
        if (signal === 'long') {
            return priceEnd - (recommendedStoplossStep * averageHeight);
        }
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
        const cond1 = this.bullishengulfingpattern || this.threewhitesoldiers || this.tweezerbottom;
        const cond2 = this.bullishhammerstick || this.abandonedbaby;
        return cond1 || cond2;
    }

    isBearishPatternFormed(candles) {
        this.calculateCandleStickPattern(candles)
        const cond1 = this.bearishengulfingpattern || this.threeblackcrows || this.tweezertop;
        const cond2 = this.shootingstar || this.eveningdojistar;
        return cond1 || cond2;
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

    getPriceFromLine ({slope, intercept}, time) {
        return (slope * time) + intercept;
    }

    getAverageHeight(candles) {
        const heights = candles.map(candle => (Math.abs(candle.high - candle.low)));
        const averageHeight = heights.reduce((pre, total) => (total + pre)) / heights.length;
        return averageHeight;
    }

    lastCandleAboveLine(line, candles) {
        const candle = Array.isArray(candles) ? candles[candles.length -1] : candles;
        const priceEnd = this.getPriceFromLine(line, candle.time);
        return candle.open > priceEnd && candle.close > priceEnd;
    }

    lastCandleBelowLine(line, candles) {
        const candle = Array.isArray(candles) ? candles[candles.length -1] : candles;
        const priceEnd = this.getPriceFromLine(line, candle.time);
        return candle.open < priceEnd && candle.close < priceEnd;
    }

    lineValidityCheck (line, candles) {
        if (!line) return false;
        const averageHeight = this.getAverageHeight(candles);
        const lastCandle = candles[candles.length - 1];
        const priceEnd = this.getPriceFromLine(line, lastCandle.time);
        const allowedDiff = 3 * averageHeight;
        const candleHeightDifference = Math.abs(priceEnd - lastCandle.close)
        const isValid = candleHeightDifference < allowedDiff;
        return isValid;
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
            lowerLine = fetchedLowerLine ? fetchedLowerLine : generatedLines.lowerLines[0];
            upperLine = fetchedUpperLine ? fetchedUpperLine : generatedLines.upperLines[0]
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
            if (!stillValid && !lowerLine) {
                generatedLines = generateLines(generateLinesConfig);
                lowerLine = generatedLines.lowerLines[0];
                await this.storeLine(lowerLine, 'lower')
            }
        }

        if (!signalInUpperLineLong && !signalInUpperLineShort) {
            // Check the Validity of the upperLine
            const stillValid = this.lineValidityCheck(upperLine, lastFiveCandles);
            if (!stillValid || !upperLine) {
                generatedLines = generateLines(generateLinesConfig);
                upperLine = generatedLines.upperLines[0];
                await this.storeLine(upperLine, 'upper');
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

    upperLineLongCheck(line, candles) {
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        if (!this.lastCandleAboveLine(line, lastFiveCandles)) return false;
        if (!this.isBullishPatternFormed(lastFiveCandles)) return false;
        return true;
    }

    upperLineShortCheck(line, candles) {
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        const averageHeight = this.getAverageHeight(lastFiveCandles);
        const priceEnd = this.getPriceFromLine(line, lastFiveCandles[lastFiveCandles.length - 1].time);
        const allowedSpace = priceEnd - averageHeight;
        const inAllowableSpace = lastFiveCandles.some((candle) => candle.high > allowedSpace);
        if (inAllowableSpace && this.isBearishPatternFormed(lastFiveCandles)) {
            return true;
        }
        return false;
    }

    lowerLineShortCheck(line, candles) {
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        if (!this.lastCandleBelowLine(line, lastFiveCandles)) return false;
        if (!this.isBearishPatternFormed(lastFiveCandles)) return false;
        return true;
    }

    lowerLineLongCheck(line, candles) {
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        const averageHeight = this.getAverageHeight(lastFiveCandles);
        const priceEnd = this.getPriceFromLine(line, lastFiveCandles[lastFiveCandles.length - 1].time);
        const allowedSpace = priceEnd + averageHeight;
        const inAllowableSpace = lastFiveCandles.some((candle) => candle.low < allowedSpace);
        if (inAllowableSpace && this.isBullishPatternFormed(lastFiveCandles)) {
            return true;
        }
        return false;
    }
    
    getOptions() {
        return {
            period: '5m',
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
            useIndicatorFilter: false, // Use an Indicator like the sma to filter out Some signals
            indicatorFilterPeriod: 60,
            indicatorFilter: 'ema',
        }
    }

}