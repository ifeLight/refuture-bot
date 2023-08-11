const { 
    sma, rsi, bollingerbands,
    ema, adx, macd,
    bullishengulfingpattern, bullishhammerstick,
    tweezerbottom, tweezertop,
    shootingstar, threeblackcrows,
    threewhitesoldiers, bearishengulfingpattern,
    abandonedbaby, eveningdojistar,
} = require('technicalindicators');

const TI = require('technicalindicators');

const periodToTimeDiff = require('../../utils/periodToTimeDiff');

module.exports = class {
    constructor(){}
    getName() {
        return 'double-bollinger';
    }

    buildIndicators(indicatorBuilder, options) {
        const {period, largePeriod, smallLength, largeLength, indicatorFilterPeriod} = options;
        indicatorBuilder.add('small_candles', 'candles', {
            period: period,
            length : smallLength + parseInt(indicatorFilterPeriod)
        })
        indicatorBuilder.add('large_candles', 'candles', {
            period: largePeriod,
            length : largeLength + parseInt(indicatorFilterPeriod)
        })
    }

    async init(indicatorPeriod, options) {
        // Meant for prebuilding Indicator Strategies
        // And it only runs once
        // and u can make use of the indicatorPeriod.storage
    }

    async period(indicatorPeriod, options) {
        try {
            const { period, largePeriod, } = options;
            this.options = options;
            this.indicatorPeriod = indicatorPeriod;
            this.SignalResult = indicatorPeriod.SignalResult;
            const smallCandles = indicatorPeriod.indicatorBuilder.get('small_candles');
            const largeCandles = indicatorPeriod.indicatorBuilder.get('large_candles');

            const lastPrice = await indicatorPeriod.getLastPrice();
            const lastSignal = indicatorPeriod.getLastSignal();
            const presentTime = indicatorPeriod.getTime();

            // Only allow this indicator to run 
            // At the early stage of the candle
            let lastSmallCandle = smallCandles[smallCandles.length - 1]
            const timeLength = periodToTimeDiff(period);
            const timeDiff = (indicatorPeriod.getTime() - lastSmallCandle.time) / timeLength;
            const onRightTime = timeDiff >= 0 && timeDiff < 0.35; //at most quarter time of the candle
            if (!onRightTime) return indicatorPeriod.createEmptySignal();

            //Remove the last incomplete candle
            let smallIncompleteCandle, largeIncompleteCandle
            if (!this.isLastCandleComplete(smallCandles, presentTime)) {
                smallIncompleteCandle = smallCandles.pop();
            }

            if (!this.isLastCandleComplete(largeCandles, presentTime)) {
                largeIncompleteCandle = largeCandles.pop();
            }

            return this.calculateSignal(smallCandles, largeCandles);

          
        } catch (error) {
             console.error(error);
        }
    }

    calculateSignal(smallCandles, largeCandles) {
        const { period, largePeriod, type, safeEntry} = this.options;
        this.createBands(smallCandles, largeCandles);
        let isLargeLong = true, isLargeShort = true; 
        let isSmallLong, isSmallShort;
        if (type === 'double') {
            isLargeLong = this.isLargeCandlesLongFormed(largeCandles);
            isLargeShort = this.isLargeCandlesShortFormed(largeCandles)
        }
        isSmallLong = this.isSmallCandlesLongFormed(smallCandles, safeEntry);
        isSmallShort = this.isSmallCandlesShortFormed(smallCandles, safeEntry);


        // console.log('---------------------')
        // console.log(`isLargeLong - ${isLargeLong}`)
        // console.log(`isLargeShort - ${isLargeShort}`)
        // console.log(`isSmallLong - ${isSmallLong}`)
        // console.log(`isSmallShort - ${isSmallShort}`)
        // console.log('---------------------')

        const toRunLong = this.toRun(smallCandles, 'long');
        const toRunShort = this.toRun(smallCandles, 'short');

        if (isLargeLong && isSmallLong && toRunLong) {
            return this.SignalResult.createSignal('long')
        }

        if (isLargeShort && isSmallShort && toRunShort) {
            return this.SignalResult.createSignal('short');
        }
        return this.SignalResult.createEmptySignal();
    }

    toRun(candles, signal = 'long') {
        const { useRSI, useIndicatorFilter} = this.options;
        if (useRSI === true) {
            if(!this.rsiCrossoverCheck(candles, signal)) return false;
        }

        if (useIndicatorFilter === true) {
            if(!this.indicatorFilterCheck(candles, signal)) return false;
        }
        return true;
    }

    indicatorFilterCheck (candles, signal = 'long') {
        const {indicatorFilterPeriod, indicatorFilter} = this.options;
        const lastCandle = candles[candles.length - 1];
        const theClosePrices = candles.map((candle) => candle.close);
        const input = {
            values: theClosePrices,
            period: Number(indicatorFilterPeriod)
        }
        const indicator = TI[indicatorFilter.toLowerCase()];
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

    isLargeCandlesLongFormed(largeCandles) {
        const lastCandle = largeCandles[largeCandles.length - 1]
        const isDirectionLong = this.isCandleDirection(lastCandle);
        const candlesBullished = this.isBullishPatternFormed(largeCandles);
        const lastLargeBBandsMainMiddle = this.largeBBandsMain[this.largeBBandsMain.length - 1].middle;
        const lastLargeBBandsMinorLower = this.largeBBandsMinor[this.largeBBandsMinor.length -1].lower;
        const lastLargeBBandsMinorUpper = this.largeBBandsMinor[this.largeBBandsMinor.length -1].upper;
        const lowerOpenCheck = lastCandle.open < lastLargeBBandsMinorLower;
        const lowerCloseCheck = lastCandle.close < lastLargeBBandsMainMiddle;
        const upperOpenCheck = lastCandle.open > lastLargeBBandsMainMiddle;
        const upperCloseCheck = lastCandle.close > lastLargeBBandsMinorUpper;
        const lowerBullish = lowerOpenCheck && lowerCloseCheck;
        const upperBullish = upperOpenCheck && upperCloseCheck;
        return (lowerBullish || upperBullish) && candlesBullished;
    }

    isLargeCandlesShortFormed (largeCandles) {
        const lastCandle = largeCandles[largeCandles.length - 1]
        const isDirectionShort = this.isCandleDirection(lastCandle, 'short');
        const candlesBearished = this.isBearishPatternFormed(largeCandles);
        const lastLargeBBandsMainMiddle = this.largeBBandsMain[this.largeBBandsMain.length - 1].middle;
        const lastLargeBBandsMinorLower = this.largeBBandsMinor[this.largeBBandsMinor.length -1].lower;
        const lastLargeBBandsMinorUpper = this.largeBBandsMinor[this.largeBBandsMinor.length -1].upper;
        const lowerOpenCheck = lastCandle.open < lastLargeBBandsMainMiddle;
        const lowerCloseCheck = lastCandle.close < lastLargeBBandsMinorLower;
        const upperOpenCheck = lastCandle.open > lastLargeBBandsMinorUpper;
        const upperCloseCheck = lastCandle.close > lastLargeBBandsMainMiddle;
        const lowerBullish = lowerOpenCheck && lowerCloseCheck;
        const upperBullish = upperOpenCheck && upperCloseCheck;
        return (lowerBullish || upperBullish) && candlesBearished;
    }

    isSmallCandlesLongFormed(smallCandles, safe = false) {
        const lastCandle = smallCandles[smallCandles.length - 1]
        const isDirectionLong = this.isCandleDirection(lastCandle);
        const candlesBullished = this.isBullishPatternFormed(smallCandles);
        const lastSmallBBandsMainMiddle = this.smallBBandsMain[this.smallBBandsMain.length - 1].middle;
        const lastSmallBBandsMinorLower = this.smallBBandsMinor[this.smallBBandsMinor.length -1].lower;
        const lastSmallBBandsMinorUpper = this.smallBBandsMinor[this.smallBBandsMinor.length -1].upper;
        const lowerOpenCheck = lastCandle.open < lastSmallBBandsMinorLower;
        const lowerCloseCheck = lastCandle.close < lastSmallBBandsMainMiddle;
        const upperOpenCheck = lastCandle.open > lastSmallBBandsMainMiddle;
        const upperCloseCheck = lastCandle.close > lastSmallBBandsMinorUpper;
        const lowerBullish = lowerOpenCheck && lowerCloseCheck;
        const upperBullish = upperOpenCheck && upperCloseCheck;
        return (lowerBullish || (upperBullish && !safe)) && candlesBullished;
    }

    isSmallCandlesShortFormed (smallCandles, safe = false) {
        const lastCandle = smallCandles[smallCandles.length - 1]
        const isDirectionShort = this.isCandleDirection(lastCandle, 'short');
        const candlesBearished = this.isBearishPatternFormed(smallCandles);
        const lastSmallBBandsMainMiddle = this.smallBBandsMain[this.smallBBandsMain.length - 1].middle;
        const lastSmallBBandsMinorLower = this.smallBBandsMinor[this.smallBBandsMinor.length -1].lower;
        const lastSmallBBandsMinorUpper = this.smallBBandsMinor[this.smallBBandsMinor.length -1].upper;
        const lowerOpenCheck = lastCandle.open < lastSmallBBandsMainMiddle;
        const lowerCloseCheck = lastCandle.close < lastSmallBBandsMinorLower;
        const upperOpenCheck = lastCandle.open > lastSmallBBandsMinorUpper;
        const upperCloseCheck = lastCandle.close > lastSmallBBandsMainMiddle;
        const lowerBullish = lowerOpenCheck && lowerCloseCheck;
        const upperBullish = upperOpenCheck && upperCloseCheck;
        return ((lowerBullish && !safe) || upperBullish) && candlesBearished;
    }

    createBands (smallCandles, largeCandles) {
        const { period, largePeriod, smallLength, largeLength, smallDeviation, largeDeviation} = this.options;
        const smallClosePrices = smallCandles.map((candle) => candle.close);
        const largeClosePrices = largeCandles.map((candle) => candle.close);

        let smallBBandsMainInput = {
            period: smallLength,
            values: smallClosePrices,
            stdDev: smallDeviation
        }

        let smallBBandsMinorInput = {
            period: smallLength,
            values: smallClosePrices,
            stdDev: smallDeviation / 2,
        }
        let largeBBandsMainInput = {
            period: largeLength,
            values: largeClosePrices,
            stdDev: largeDeviation
        }

        let largeBBandsMinorInput = {
            period: largeLength,
            values: largeClosePrices,
            stdDev: largeDeviation / 2,
        }
        this.smallBBandsMain = bollingerbands(smallBBandsMainInput);
        this.smallBBandsMinor = bollingerbands(smallBBandsMinorInput);
        this.largeBBandsMain = bollingerbands(largeBBandsMainInput);
        this.largeBBandsMinor = bollingerbands(largeBBandsMinorInput);
    }

    isLastCandleComplete(candles, presentTime) {
        // console.log(candles.length)
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

    isCandleDirection(candle, direction = 'long',) {
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
        const res = {}
        //Bullish Pattren
        res.bullishengulfingpattern = bullishengulfingpattern(lastTwoCandles);
        res.threewhitesoldiers = threewhitesoldiers(lastThreeCandles);
        res.tweezerbottom = tweezerbottom(lastFiveCandles);
        res.bullishhammerstick = bullishhammerstick(lastCandle);
        res.abandonedbaby = abandonedbaby(lastThreeCandles);

        //Bearish Pattern
        res.bearishengulfingpattern = bearishengulfingpattern(lastTwoCandles);
        res.threeblackcrows = threeblackcrows(lastThreeCandles);
        res.tweezertop = tweezertop(lastFiveCandles);
        res.shootingstar = shootingstar(lastFiveCandles);
        res.eveningdojistar = eveningdojistar(lastThreeCandles)
        return res;
    }

    isBullishPatternFormed(candles) {
        const res = this.calculateCandleStickPattern(candles)
        const lastCandle = candles[candles.length - 1]
        const isDirectionLong = this.isCandleDirection(lastCandle);
        const cond1 = res.bullishengulfingpattern || res.threewhitesoldiers ;
        const cond2 = res.bullishhammerstick || res.abandonedbaby;
        // console.log(`Bullish - ${(cond1 || cond2) && isDirectionLong}`);
        return (cond1 || cond2) && isDirectionLong;
    }

    isBearishPatternFormed(candles) {
        const res = this.calculateCandleStickPattern(candles);
        const lastCandle = candles[candles.length - 1]
        const isDirectionShort = this.isCandleDirection(lastCandle, 'short');
        const cond1 = res.bearishengulfingpattern || res.threeblackcrows ;
        const cond2 = res.shootingstar || res.eveningdojistar;
        // console.log(`Bearish - ${(cond1 || cond2) && isDirectionShort}`);
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
    
    getOptions() {
        return {
            period: '5m',
            largePeriod: '30m',
            smallLength: 20,
            largeLength: 20,
            smallDeviation: 2,
            largeDeviation: 2,
            smallIndicator: 'sma', // Yet to b implemented
            largeIndicator: 'sma',  // Yet to b implemented
            longRSI: 14,
            shortRSI: 6,
            useRSI: true,
            useIndicatorFilter: false, // Use an Indicator like the sma to filter out Some signals
            indicatorFilterPeriod: 60,
            indicatorFilter: 'ema',
            type: 'double', // It can be 'single' or 'double'
            safeEntry: false
        }
    }

}