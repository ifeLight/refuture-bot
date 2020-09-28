const { 
    BollingerBands, sma, rsi,
    bullishengulfingpattern, bullishhammerstick,
    tweezerbottom, tweezertop,
    shootingstar, threeblackcrows,
    threewhitesoldiers, bearishengulfingpattern,
    abandonedbaby, darkcloudcover,
    eveningdojistar, piercingline
} = require('technicalindicators');

class TrailerFibonacci {
    constructor (entryPrice, positionSide) {
        this.entryPrice = entryPrice;
        this.positionSide = positionSide;
        this.trailPrice = null;
    }
}

module.exports = class Trailer {
    getName() {
        return 'trailer-fibonacci';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
    }

    buildIndicators(indicatorBuilder, options) {
        const { period } = options;
        indicatorBuilder.add('checkCandles', 'candles', {
            period,
            length: 10
        });
    }

    async period(safetyPeriod, options, strat) {
        this.safetyPeriod = safetyPeriod;
        this.isBacktest = (this.safetyPeriod.getEnvironment()).backtest;
        const {loss: lossConfig, profit: profitConfig, period } = options;
        this.lossConfig = lossConfig;
        this.profitConfig = profitConfig;
        const isFutures = safetyPeriod.isFutures();
        const presentPrice = safetyPeriod.getLastPrice();
        this.presentPrice = presentPrice;
        this.checkCandles = safetyPeriod.indicatorBuilder.get('checkCandles');
        // This is for  function to request for a closure
        this.shouldClose = false;
        
        try {
            if (isFutures || isBacktest) {
                const positions = await safetyPeriod.getPositions();
                if (positions && Array.isArray(positions) && positions.length > 0) {
                    const position = positions[0];
                    const {positionSide, entryPrice } = position;
                    this.trail = await this.retrievePosition(entryPrice, positionSide);
                    const result = this.calculateSignal();
                    await this.storePosition(this.trail);
                    return result;
                }
            }
    
            if (!isFutures && !isBacktest) {
                const {amount, currency_amount} = strat.trade;
                let tradeAmount = amount ? Number(amount) : Number(safetyPeriod.getLastPrice()) / Number(currency_amount);
                const baseCurrency = (safetyPeriod.getPairInfo()).base;
                let baseBalance = await safetyPeriod.getBalance(baseCurrency);
                const totalBalance = baseBalance.locked + baseBalance.free;
                const closedOrders = await safetyPeriod.getClosedOrders();
                const closedOrdersValidityCheck = closedOrders && Array.isArray(closedOrders) && closedOrders.length > 0;
                const balanceAvailabilityCheck = totalBalance > (tradeAmount - (tradeAmount * 0.9));
                if (balanceAvailabilityCheck && closedOrdersValidityCheck) {
                    const filteredOrder = closedOrders.filter((order) => {
                        return order.side == 'buy';
                    })
                    const latestClosedOrder = filteredOrder.reduce((prev, current) => {
                        if (!prev) return current;
                        if (parseInt(prev.time) > parseInt(current.time) ) return prev;
                        return current;
                    });
                    const { price: entryPrice  } = latestClosedOrder;
                    const positionSide = 'LONG';
                    this.trail = await this.retrievePosition(entryPrice, positionSide);
                    const result = this.calculateSignal();
                    await this.storePosition(this.trail);
                    return result;
                }
    
            }
        } catch (error) {
            console.error(error);
        }
        
        return safetyPeriod.createEmptySignal();
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

    isLastCandleComplete(candles) {
        const presentTime = this.safetyPeriod.getTime();
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

    calculateCandleStickPattern(candles) {
        if(!this.isLastCandleComplete(candles)) {
            candles.pop();
        }
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
        this.piercingline = piercingline(lastTwoCandles)

        //Bearish Pattern
        this.bearishengulfingpattern = bearishengulfingpattern(lastTwoCandles);
        this.threeblackcrows = threeblackcrows(lastThreeCandles);
        this.tweezertop = tweezertop(lastFiveCandles);
        this.shootingstar = shootingstar(lastFiveCandles);
        this.darkcloudcover = darkcloudcover(lastTwoCandles);
        this.eveningdojistar = eveningdojistar(lastThreeCandles)

    }

    isBullishPatternFormed() {
        const cond1 = this.bullishengulfingpattern || this.threewhitesoldiers || this.tweezerbottom;
        const cond2 = this.bullishhammerstick || this.abandonedbaby || this.piercingline;
        return cond1 || cond2;
    }

    isBearishPatternFormed() {
        const cond1 = this.bearishengulfingpattern || this.threeblackcrows || this.tweezertop;
        const cond2 = this.shootingstar || this.darkcloudcover || this.eveningdojistar;
        return cond1 || cond2;
    }

    calculateSignal() {
        this.starter();
        this.calculateCandleStickPattern(this.checkCandles);
        this.minimizeLoss();
        this.secureProfit();
        if (!this.shouldClose) {
            this.maximizeSuperProfit(this.checkCandles)
        }
        const {positionSide, trailPrice} = this.trail;
        const presentPrice = this.presentPrice;
        if (positionSide === 'LONG') {
            if (presentPrice < trailPrice || this.shouldClose) {
                return  this.safetyPeriod.createSignal('close', {
                    trailPrice,
                    presentPrice
                })
            }
        }
        if (positionSide === 'SHORT') {
            if (presentPrice > trailPrice || this.shouldClose) {
                return  this.safetyPeriod.createSignal('close', {
                    trailPrice,
                    presentPrice
                })
            }
        }
        let signalResult = this.safetyPeriod.createEmptySignal({
            trailPrice,
            presentPrice
        })
        signalResult.setOrderAdvice('close', trailPrice)
        return signalResult;
    }

    starter() {
        const trail = this.trail;
        if (!trail.trailPrice) {
            const lossDiff = (parseFloat(this.lossConfig) / 100) * trail.entryPrice;
            if (trail.positionSide == 'LONG') {
                this.trail.trailPrice = trail.entryPrice - lossDiff;
            }
            if (trail.positionSide == 'SHORT') {
                this.trail.trailPrice = trail.entryPrice + lossDiff;
            } 
        }
         
    }

    getAverageHeight(candles) {
        const heights = candles.map(candle => (Math.abs(candle.high - candle.low)));
        const averageHeight = heights.reduce((pre, total) => (total + pre)) / heights.length;
        return averageHeight;
    }

    maximizeSuperProfit(candles) {
        const currentPrice = this.presentPrice;
        const entryPrice = this.trail.entryPrice;
        const positionSide = this.trail.positionSide;
        const profitDiff = (parseFloat(this.profitConfig) / 100) * entryPrice;
        const longDiff = currentPrice - entryPrice;
        const shortDiff = entryPrice - currentPrice;

        const lastCandle = candles[candles.length - 1];
        const candlesMinusLastCandle = candles.slice(0, candles.length - 1);
        const averageCandlesHeight = this.getAverageHeight(candlesMinusLastCandle);
        const lastCandleHeight = lastCandle.high - lastCandle.low;
        const secondToLastCandle = candles[candles.length - 2];
        const thirdToLastCandle = candles[candles.length - 3];

        if (positionSide == 'LONG') {
            if (longDiff < profitDiff) return;
            if ((lastCandleHeight > (2 * averageCandlesHeight)) && (lastCandle.high - lastCandle.close) > (0.5 *lastCandleHeight)) {
                this.shouldClose = true;
            }
            if (this.isBearishPatternFormed()) {
                this.shouldClose = true;
            }

            if (secondToLastCandle.low > thirdToLastCandle.open){
                if (this.trail.trailPrice < secondToLastCandle.low) {
                    this.trail.trailPrice = secondToLastCandle.low;
                }
            }

            if (secondToLastCandle.open > thirdToLastCandle.open){
                if (this.trail.trailPrice < secondToLastCandle.open) {
                    this.trail.trailPrice = secondToLastCandle.open;
                }
            }      

        }

        if (positionSide == 'SHORT') {
            if (shortDiff < profitDiff) return;
            if ((lastCandleHeight > (2 * averageCandlesHeight)) && (lastCandle.close - lastCandle.low) > (0.5 *lastCandleHeight)) {
                this.shouldClose = true;
            }
            if (this.isBullishPatternFormed()) {
                this.shouldClose = true;
            }

            if (secondToLastCandle.high < thirdToLastCandle.open){
                if (this.trail.trailPrice > secondToLastCandle.high) {
                    this.trail.trailPrice = secondToLastCandle.high;
                }
            }

            if (secondToLastCandle.open < thirdToLastCandle.open){
                if (this.trail.trailPrice > secondToLastCandle.open) {
                    this.trail.trailPrice = secondToLastCandle.open;
                }
            }  
        }
    }

    secureProfit() {
        const currentPrice = this.presentPrice;
        const entryPrice = this.trail.entryPrice;
        const positionSide = this.trail.positionSide;
        const trailPrice = this.trail.trailPrice;
        const profitDiff = (parseFloat(this.profitConfig) / 100) * entryPrice;
        const longDiff = currentPrice - entryPrice;
        const shortDiff = entryPrice - currentPrice;

        const trailPriceLongDiff = currentPrice - trailPrice;
        const trailPriceShortDiff = trailPrice - currentPrice;

        const fib2 = 0.28 * profitDiff;
        const fib3 = 0.382 * profitDiff;
        const fib5 = 0.5 * profitDiff;
        const fib6 = 0.618 * profitDiff;
        const fib7 = 0.72 * profitDiff;

        if (positionSide == 'LONG') {
            if (longDiff < 0) return;
            if (longDiff > fib3 && trailPrice < entryPrice) {
                this.trail.trailPrice = entryPrice;
            }

            if (longDiff > fib5 && trailPrice < (fib2 + entryPrice)) {
                this.trail.trailPrice = entryPrice + fib2;
            }

            if (longDiff > fib6 && trailPrice < (fib3 + entryPrice)) {
                this.trail.trailPrice = entryPrice + fib3;
            }

            if (longDiff > fib7 && trailPrice < (fib5 + entryPrice)) {
                this.trail.trailPrice = entryPrice + fib5;
            }

            if (longDiff > profitDiff && trailPrice < (fib6 + entryPrice)) {
                this.trail.trailPrice = entryPrice + fib6;
            }

            if ((longDiff > fib3 && longDiff < fib5) || (longDiff > fib7 && longDiff < profitDiff)) {
                if (this.isBearishPatternFormed()) {
                    this.shouldClose = true;
                }
            }
        }

        if (positionSide == 'SHORT') {
            if (shortDiff < 0) return;
            if (shortDiff > fib3 && trailPrice > entryPrice) {
                this.trail.trailPrice = entryPrice;
            }

            if (shortDiff > fib5 && trailPrice > (entryPrice - fib2)) {
                this.trail.trailPrice = entryPrice - fib2;
            }

            if (shortDiff > fib6 && trailPrice > (entryPrice - fib3)) {
                this.trail.trailPrice = entryPrice - fib3;
            }

            if (shortDiff > fib7 && trailPrice > (entryPrice - fib5)) {
                this.trail.trailPrice = entryPrice - fib5;
            }

            if (shortDiff > profitDiff && trailPrice > (entryPrice - fib6)) {
                this.trail.trailPrice = entryPrice - fib6;
            }

            if ((shortDiff > fib3 && shortDiff < fib5) || (shortDiff > fib7 && shortDiff < profitDiff)) {
                if (this.isBullishPatternFormed()) {
                    this.shouldClose = true;
                }
            }
        }
    }

    minimizeLoss() {
        //Using Fibunacii to Minimize Loss
        const currentPrice = this.presentPrice;
        const entryPrice = this.trail.entryPrice;
        const positionSide = this.trail.positionSide;
        const trailPrice = this.trail.trailPrice;
        const longDiff = currentPrice - entryPrice;
        const shortDiff = entryPrice - currentPrice;
        const trailPriceLongDiff = entryPrice - trailPrice;
        const trailPriceShortDiff = trailPrice - entryPrice;
        const lossDiff = (parseFloat(this.lossConfig) / 100) * entryPrice;
        const fib2 = 0.28 * lossDiff;
        const fib3 = 0.382 * lossDiff;
        const fib5 = 0.5 * lossDiff;
        const fib6 = 0.618 * lossDiff;
        const fib7 = 0.72 * lossDiff;
        if (positionSide == 'LONG') {
            // When current price > fib2
            if (longDiff > fib2 && trailPriceLongDiff > fib7 ) {
                this.trail.trailPrice = entryPrice - fib7;
            }
            // When current price > fib3
            if (longDiff > fib3 && trailPriceLongDiff > fib6 ) {
                this.trail.trailPrice = entryPrice - fib6;
            }
            // When current price > fib5
            if (longDiff > fib5 && trailPriceLongDiff > fib5 ) {
                this.trail.trailPrice = entryPrice - fib5;
            }
            // When current price > fib6
            if (longDiff > fib6 && trailPriceLongDiff > fib3 ) {
                this.trail.trailPrice = entryPrice - fib3;
            }
            // When current price > fib7
            if (longDiff > fib7 && trailPriceLongDiff > fib2 ) {
                this.trail.trailPrice = entryPrice - fib2;
            }
            // When current price > fib7
            if (longDiff > lossDiff && trailPrice < entryPrice ) {
                this.trail.trailPrice = entryPrice;
            }  
        }
        if (positionSide == 'SHORT') {
            // When current price > fib2
            if (shortDiff > fib2 && trailPriceShortDiff > fib7 ) {
                this.trail.trailPrice = entryPrice + fib7;
            }
            // When current price > fib3
            if (shortDiff > fib3 && trailPriceShortDiff > fib6 ) {
                this.trail.trailPrice = entryPrice + fib6;
            }
            // When current price > fib5
            if (shortDiff > fib5 && trailPriceShortDiff > fib5 ) {
                this.trail.trailPrice = entryPrice + fib5;
            }
            // When current price > fib6
            if (shortDiff > fib6 && trailPriceShortDiff > fib3 ) {
                this.trail.trailPrice = entryPrice + fib3;
            }
            // When current price > fib7
            if (shortDiff > fib7 && trailPriceShortDiff > fib2 ) {
                this.trail.trailPrice = entryPrice + fib2;
            }
            // When current price > fib7
            if (shortDiff > lossDiff && trailPrice > entryPrice ) {
                this.trail.trailPrice = entryPrice;
            }  
        } 
        
    }

    async storePosition (data) {
        const storageKey = `trailer_fibonacci${this.isBacktest ? '_bt': ''}`;
        await this.safetyPeriod.storage.set(storageKey, data);
    }

    async retrievePosition (entryPrice, positionSide) {
        const storageKey = `trailer_fibonacci${this.isBacktest ? '_bt': ''}`;
        const retrievedPosition = await this.safetyPeriod.storage.get(storageKey);
        if (retrievedPosition && retrievedPosition.hasOwnProperty('entryPrice') && retrievedPosition.hasOwnProperty('positionSide')) {
            if (retrievedPosition.entryPrice === entryPrice && retrievedPosition.positionSide === positionSide) {
                const theTrailerClass = new TrailerClass(entryPrice, positionSide);
                const propertyNames = Object.getOwnPropertyNames(retrievedPosition);
                propertyNames.forEach((key) => {
                    theTrailerClass[key] = retrievedPosition[key];
                })
                return theTrailerClass;
            }
            return new TrailerClass(entryPrice, positionSide);
        } else {
            return new TrailerClass(entryPrice, positionSide);
        }
    }


    getOptions() {
        return {
            loss: 1,
            profit: 4,
            period: '5m'
        }
    }

}