const sma = require('technicalindicators').sma;
const rsi = require('technicalindicators').rsi;

const { BollingerBands, 
    SMA, EMA,
    bullishengulfingpattern, bullishhammerstick,
    tweezerbottom, tweezertop,
    shootingstar, threeblackcrows,
    threewhitesoldiers, bearishengulfingpattern,
    abandonedbaby, darkcloudcover,
    eveningdojistar,
} = require('technicalindicators');


const linearRegression = require('../../utils/calculations/linearRegression');
const getPivots = require('../../utils/calculations/getPivots');
const generateLines = require('../../utils/generateLines')

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
            const { period: candlePeriod, length } = options;
            this.indicatorPeriod = indicatorPeriod;
            this.candlePeriod = candlePeriod;
            
            const lastPrice = indicatorPeriod.getLastPrice();
            const lastSignal = indicatorPeriod.getLastSignal();
            const presentTime = indicatorPeriod.getTime();
            const candles = indicatorPeriod.indicatorBuilder.get('candles');

            //Lines generator configuration
            const generateLinesConfig = {
                candles, candleDepth: 5, 
                maxLines: 5, 
                lineAllowancePercentage: 0.1, 
                priceLineDiffPercentage: 2
            }

            //Remove the last incomplete candle
            let incompleteCandle;
            if (!this.isLastCandleComplete()) {
                incompleteCandle = candles.pop();
            }

            // Last Five Candles
            const lastFiveCandles = candles.slice(candles.length - 5, candles.length);

            // Fetch Active lower and upper lines
            let lowerLine, upperLine, generatedLines;
            let fetchedLowerLine = await this.getLine('lower');
            let fetchedUpperLine = await this.getLine('upper');
            if (!fetchedUpperLine || !fetchedLowerLine) {
                generatedLines = generateLines(generateLinesConfig);
                lowerLine = fetchedLowerLine ? fetchedLowerLine : generatedLines.lowerLines[0];
                upperLine = fetchedUpperLine ? fetchedUpperLine : generatedLines.upperLines[0]
            } else {
                lowerLine = fetchedLowerLine;
                upperLine = fetchedUpperLine;
            }

            //Checking to Buy long on Upper Line
            if (this.upperLineLongCheck(upperLine, lastFiveCandles)) {
                let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, upperLine, 'long');
                return indicatorPeriod.createSignal('long', {
                    stoploss: recommendedStoploss
                });
            }

            // Checking To buy Short on UpperLine
            if (this.upperLineShortCheck(upperLine, lastFiveCandles)) {
                let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, upperLine, 'short');
                return indicatorPeriod.createSignal('short', {
                    stoploss: recommendedStoploss
                });
            } else {
                // Check the Validity of the upperLine
                const stillValid = this.lineValidityCheck(upperLine, lastFiveCandles);
                if (!stillValid) {
                    generatedLines = generateLines(generateLinesConfig);
                    upperLine = generatedLines.upperLines[0];
                    await this.storeLine(upperLine, 'upper')
                }
            }


            //Checking to Buy long on Lower Line
            if (this.upperLineLongCheck(lowerLine, lastFiveCandles)) {
                let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, lowerLine, 'long');
                return indicatorPeriod.createSignal('long', {
                    stoploss: recommendedStoploss
                });
            }

            // Checking To buy Short on LowerLine
            if (this.upperLineShortCheck(lowerLine, lastFiveCandles)) {
                let recommendedStoploss = this.getRecommendedStopLoss(lastFiveCandles, lowerLine, 'short');
                return indicatorPeriod.createSignal('short', {
                    stoploss: recommendedStoploss
                });
            } else {
                // Check the Validity of the lowerLine
                const stillValid = this.lineValidityCheck(lowerLine, lastFiveCandles);
                if (!stillValid) {
                    generatedLines = generateLines(generateLinesConfig);
                    lowerLine = generatedLines.lowerLines[0];
                    await this.storeLine(lowerLine, 'lower')
                }
            }

            // Return Empty, when no Signal Generated
            return indicatorPeriod.createEmptySignal();

        } catch (error) {
             console.error(error);
             throw error;
        }
    }

    async storeLine(line, type) {
        //type can be 'lower' or 'upper'
        const key = `${this.candlePeriod}_${type}`
        await this.indicatorPeriod.storage.set(key, line);
    }

    async getLine(type) {
        const key = `${this.candlePeriod}_${type}`
        const line = await this.indicatorPeriod.storage.get(key);
        return line;
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
        const averageHeight = this.getAverageHeight(candles);
        const priceEnd = this.getPriceFromLine(line, candles[candles.length - 1].time);
        if (signal === 'short') {
            return priceEnd + (4 * averageHeight);
        }
        if (signal === 'long') {
            return priceEnd - (4 * averageHeight);
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
        this.darkcloudcover = darkcloudcover(lastTwoCandles);
        this.eveningdojistar = eveningdojistar(lastThreeCandles)

    }

    isBullishPatterFormed() {
        this.calculateCandleStickPattern()
        const cond1 = this.bullishengulfingpattern || this.threewhitesoldiers || this.tweezerbottom;
        const cond2 = this.bullishhammerstick || this.abandonedbaby;
        return cond1 || cond2;
    }

    isBearishPatternFormed() {
        this.calculateCandleStickPattern()
        const cond1 = this.bearishengulfingpattern || this.threeblackcrows || this.tweezertop;
        const cond2 = this.shootingstar || this.darkcloudcover || this.eveningdojistar;
        return cond1 || cond2;
    }
    

    generateCandlesticksInputs(candles, length) {
        const retouchedCandles = {open: [], close: [], high: [], volume: [], low: []};
        const startingPoint = length && (length < candles.length)? candles.length - length: 0;
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
        const averageHeight = this.getAverageHeight(candles);
        const lastCandle = candles[candles.length - 1];
        const priceEnd = this.getPriceFromLine(line, lastCandle.time);
        const allowedDiff = 3 * averageHeight;
        const candleHeightDifference = Math.abs(priceEnd - lastCandle.close)
        const isValid = candleHeightDifference < allowedDiff;
        return isValid;
    }

    upperLineLongCheck(line, lastFiveCandles) {
        if (!this.lastCandleAboveLine(line, lastFiveCandles)) return false;
        if (!this.isBullishPatterFormed()) return false;
        return true;
    }

    upperLineShortCheck(line, lastFiveCandles) {
        const averageHeight = this.getAverageHeight(lastFiveCandles);
        const priceEnd = this.getPriceFromLine(line, lastFiveCandles[lastFiveCandles.length - 1].time);
        const allowedSpace = priceEnd - averageHeight;
        const inAllowableSpace = lastFiveCandles.some((candle) => candle.high > allowedSpace);
        if (inAllowableSpace && this.isBearishPatternFormed()) {
            return true;
        }
        return false;
    }

    lowerLineShortCheck(line, lastFiveCandles) {
        if (!this.lastCandleBelowLine(line, lastFiveCandles)) return false;
        if (!this.isBearishPatternFormed()) return false;
        return true;
    }

    lowerLineLongCheck(line, lastFiveCandles) {
        const averageHeight = this.getAverageHeight(lastFiveCandles);
        const priceEnd = this.getPriceFromLine(line, lastFiveCandles[lastFiveCandles.length - 1].time);
        const allowedSpace = priceEnd + averageHeight;
        const inAllowableSpace = lastFiveCandles.some((candle) => candle.low < allowedSpace);
        if (inAllowableSpace && this.isBullishPatterFormed()) {
            return true;
        }
        return false;
    }
    
    getOptions() {
        return {
            period: '5m',
            length: 100,
        }
    }

}