const { 
    BollingerBands, sma, rsi,
    ema, adx, macd, bullish, bearish,
} = require('technicalindicators');

const TI = require('technicalindicators');
const generateLines = require('../../utils/supportResistanceGen');
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

            this.candles = candles;
            
            return this.calculateSignal(candles);

        } catch (error) {
            console.error(error);
             throw error;
        }
    }

    genLines () {
        const candles = this.candles;
        const { candleDepth, candleSizeDiff, minMatch } = this.options;
        const generatedLines = generateLines({candles, candleDepth, candleSizeDiff, minMatch});
        return {
            time: this.indicatorPeriod.getTime(),
            lines: generatedLines
        }
    }

    storageKey () {
        return  `${this.candlePeriod}`;
    }

    async storeLines(generatedLines) {
        const key = this.storageKey();
        await this.indicatorPeriod.storage.set(key, generatedLines);
    }

    // Comes with auto store lines
    async fetchLines() {
        const key = this.storageKey();
        const initailFetchLines = await this.indicatorPeriod.storage.get(key);
        if (initailFetchLines && initailFetchLines.time) {
            const { candleDepth, period} = this.options;
            const {time} = initailFetchLines;
            const thisTime =  this.indicatorPeriod.getTime();
            const periodInMs = periodToTimeDiff(period);
            const stretchedTime = periodInMs * Number(candleDepth);
            if ((thisTime - time) < stretchedTime) {
                return initailFetchLines.lines;
            } else {
                let genLines = this.genLines();
                await this.storeLines(genLines);
                return genLines.lines;
            }
        } else {
            let genLines = this.genLines();
            await this.storeLines(genLines);
            return genLines.lines;
        }
    }

    avaerageSpaceBetweenLines (lines) {
        const prices = lines.map((line) => line.price);
        let priceRangeDiff = [];
        for (let i = 0; i < prices.length - 1; i++) {
            priceRangeDiff.push(Math.abs(prices[i + 1] - prices[i]));
        }
        const totalDiff = priceRangeDiff.reduce((prev, next) => { return prev + next});
        const averageSpace = totalDiff / priceRangeDiff.length;
        return averageSpace;
    }

    averageCandlesPerSpace (lines, candles) {
        const averageHeight = this.getAverageHeight(candles);
        const averageSpace = this.avaerageSpaceBetweenLines(lines);
        return averageHeight / averageSpace;
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

    isBullishPatternFormed(candles) {
        const lastCandle = candles[candles.length - 1]
        const isDirectionLong = this.isCandleDirection(lastCandle);
        return bullish(this.generateCandlesticksInputs(candles, 10)) && isDirectionLong;
    }

    isBearishPatternFormed(candles) {
        const lastCandle = candles[candles.length - 1]
        const isDirectionShort = this.isCandleDirection(lastCandle, 'short');
        return bearish(this.generateCandlesticksInputs(candles, 10)) && isDirectionShort;
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

    lastCandleAbovePrice(price, candles) {
        const candle = Array.isArray(candles) ? candles[candles.length -1] : candles;
        return candle.open > price && candle.close > price;
    }

    lastCandleBelowPrice(price, candles) {
        const candle = Array.isArray(candles) ? candles[candles.length -1] : candles;
        return candle.open < price && candle.close < price;
    }

    isCandlesTouchingPrice (price, candles) {
        const res = candles.some((candle) => {
            return (candle.high > price) && (candle.low < price);
        })
        return res;
    }

    getActiveLine(presentPrice, lines) {
        let activeLine;
        let curentDiff = Infinity;
        for (let index = 0; index < lines.length; index++) {
            const price = lines[index].price;
            const diff = Math.abs(presentPrice - price);
            if (diff < curentDiff) {
                curentDiff = diff;
                activeLine = lines[index]
            }
        }
        return activeLine;
    }

    signalToLong() {
        
    }

    async calculateSignal(candles) {
        const {onlyReversal: onlyReversalConfig, onlyRebounce: onlyRebounceConfig} = this.options;
        const presentPrice = await this.indicatorPeriod.getLastPrice();
        //Last Five Candles
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        const lines = await this.fetchLines();
        const onlyReversal = onlyReversalConfig === true;
        const onlyRebounce = onlyRebounceConfig === true;
        
        if (lines.length < 2) return this.indicatorPeriod.createEmptySignal();

        const toRunLong = this.toRun(candles, 'long');
        const toRunShort = this.toRun(candles, 'short');

        const activeLine = this.getActiveLine(presentPrice, lines);


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