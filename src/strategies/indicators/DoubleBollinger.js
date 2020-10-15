const { 
    sma, rsi, bollingerbands,
    ema, adx, macd,
    bullishengulfingpattern, bullishhammerstick,
    tweezerbottom, tweezertop,
    shootingstar, threeblackcrows,
    threewhitesoldiers, bearishengulfingpattern,
    abandonedbaby, eveningdojistar,
} = require('technicalindicators');

const periodToTimeDiff = require('../../utils/periodToTimeDiff');

module.exports = class {
    constructor(){}
    getName() {
        return 'double-bollinger';
    }

    buildIndicators(indicatorBuilder, options) {
        const {period, largePeriod, smallLength, largeLength} = options;
        indicatorBuilder.add('small_candles', 'candles', {
            period: period,
            length : smallLength + 20
        })
        indicatorBuilder.add('large_candles', 'candles', {
            period: largePeriod,
            length : largeLength + 20
        })
    }

    async init(indicatorPeriod, options) {
        // Meant for prebuilding Indicator Strategies
        // And it only runs once
        // and u can make use of the indicatorPeriod.storage
    }

    async period(indicatorPeriod, options) {
        try {
            const { period, largePeriod, smallLength, largeLength, smallDeviation, largeDeviation} = options;
            this.options = options;
            this.indicatorPeriod = indicatorPeriod;
            this.SignalResult = indicatorPeriod.SignalResult;
            const smallCandles = indicatorPeriod.indicatorBuilder.get('small_candles');
            const largeCandles = indicatorPeriod.indicatorBuilder.get('large_candles');

            const lastPrice = indicatorPeriod.getLastPrice();
            const lastSignal = indicatorPeriod.getLastSignal();

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

            return calculateSignal(smallCandles, largeCandles);

          
        } catch (error) {
             console.error(error);
        }
    }

    calculateSignal(smallCandles, largeCandles) {
        const { period, largePeriod} = this.options;
        this.createBands(smallCandles, largeCandles);

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
        return (cond1 || cond2) && isDirectionLong;
    }

    isBearishPatternFormed(candles) {
        const res = this.calculateCandleStickPattern(candles);
        const lastCandle = candles[candles.length - 1]
        const isDirectionShort = this.isCandleDirection(lastCandle, 'short');
        const cond1 = res.bearishengulfingpattern || res.threeblackcrows ;
        const cond2 = res.shootingstar || res.eveningdojistar;
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
        }
    }

}