const { chandelierexit } = require('technicalindicators');

class TrailerPosition {
    constructor (entryPrice, positionSide = 'LONG') {
        this.positionSide = positionSide;
        this.entryPrice = entryPrice;
        this.stoplossPrice = null;
        this.initialCorrectSide = null;
        this.exitPrice = null;
        this.initialCorrectSide2 = null,
        this.exitPrice2 = null;
    }
}

module.exports = class TrailerChandelier {
    getName() {
        return 'trailer-chandelier';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
    }

    buildIndicators(indicatorBuilder, options) {
        const { period, length } = options;
        indicatorBuilder.add('candles', 'candles', {
            period,
            length
        });
    }

    async period(safetyPeriod, options, strat) {
        try {
            this.options = options;
            const isFutures = safetyPeriod.isFutures();
            this.presentPrice = await safetyPeriod.getLastPrice();
            const isBacktest = (safetyPeriod.getEnvironment()).backtest;
            this.isBacktest = isBacktest;
            this.safetyPeriod = safetyPeriod;
            const candles = safetyPeriod.indicatorBuilder.get('candles');
            const presentTime = safetyPeriod.getTime();
            let incompleteCandle;
            if (!this.isLastCandleComplete(candles, presentTime)) {
                incompleteCandle = candles.pop();
            }
            if (isFutures || isBacktest) {
                const positions = await safetyPeriod.getPositions();
                if (positions && Array.isArray(positions) && positions.length > 0) {
                    const position = positions[0];
                    const {positionSide, entryPrice} = position;
                    const res = await this.handlePosition(entryPrice, positionSide, candles);
                    return res;
                }
            }

            if (!isFutures && !isBacktest) {
                const {amount, currency_amount} = strat.trade;
                let tradeAmount = amount ? Number(amount) : Number(this.presentPrice) / Number(currency_amount);
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
                    // Same as handle Long Position
                    const res = await this.handlePosition(entryPrice, 'LONG', candles);
                    return res;
                }

            }
            return safetyPeriod.createEmptySignal();
        } catch (error) {
            console.error(error);
        }
    }

    async handlePosition(entryPrice, positionSide, candles) {
        const { double } = this.options;
        let safetyResult = this.safetyPeriod.createEmptySignal();
        const presentTime = this.safetyPeriod.getTime();
        const presentPrice = this.presentPrice;

        let majorResult = await this.runChandelier(entryPrice, positionSide, candles)
        if (majorResult.stoploss) {
            safetyResult.setOrderAdvice('close', majorResult.stoploss);
        }

        if (double) {
            let minorResult = await this.runChandelier(entryPrice, positionSide, candles, false);
            let isPositive = positionSide == 'LONG' ? presentPrice > entryPrice: positionSide == 'SHORT'? presentPrice < entryPrice: false;
            if (isPositive) {
                if (minorResult.close) {
                    safetyResult.setSignal('close');
                    safetyResult.mergeDebug({...minorResult.debug});
                }
            } else {
                if (majorResult.close) {
                    safetyResult.setSignal('close');
                    safetyResult.mergeDebug({...majorResult.debug});
                }
            }

        } else{
            if (majorResult.close) {
                safetyResult.setSignal('close');
                safetyResult.mergeDebug({...majorResult.debug});
            }
        }
        
        return safetyResult;
    }

    async runChandelier(entryPrice, positionSide, candles, main = true) {
        const retrievedPosition = await this.retrievePosition(entryPrice, positionSide);
        const initialCorrectSideKey = main ? 'initialCorrectSide': 'initialCorrectSide2';
        const exitPriceKey = main ? 'exitPrice': 'exitPrice2';
        const {multiplier, multiplier2,  chandelier: chandelierPeriod, chandelier2, useStoploss, stoplossSteps, dynamic} = this.options;
        let multiplierToUse = main ? multiplier : multiplier2;
        let periodToUse = main ? chandelierPeriod : chandelier2;
        let input = this.generateCandlesticksInputs(candles);
        input = {...input, multiplier: multiplierToUse, period: periodToUse}
        const result = chandelierexit(input);
        const lastResult = result[result.length - 1];
        const lastCandle = candles[candles.length - 1];
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        const averageHeight = this.getAverageHeight(lastFiveCandles)
        const {exitLong, exitShort} = lastResult;
        const finalResult = {};
        finalResult.debug = {};
        
        if (positionSide === 'LONG') {
            if (retrievedPosition[initialCorrectSideKey] === false || retrievedPosition[initialCorrectSideKey] === null) {
                if (lastCandle.open > exitLong && lastCandle.close > exitLong) {
                    retrievedPosition[initialCorrectSideKey] = true;
                } else {
                    retrievedPosition[initialCorrectSideKey] = false;
                }
            }

            if (retrievedPosition[initialCorrectSideKey] === true) {
                if (useStoploss === true && main) {
                    const newStoploss = exitLong - (averageHeight * stoplossSteps)
                    if (!retrievedPosition.stoplossPrice) {
                        retrievedPosition.stoplossPrice = newStoploss;
                        finalResult.stoploss = newStoploss
                    } else {
                        if (retrievedPosition.stoplossPrice < newStoploss) {
                            retrievedPosition.stoplossPrice = newStoploss;
                            finalResult.stoploss = newStoploss
                        }
                    }
                }

                if (!retrievedPosition[exitPriceKey]) {
                    retrievedPosition[exitPriceKey] = exitLong;
                }
                if (retrievedPosition[exitPriceKey]) {
                    if (!dynamic) {
                        if (exitLong > retrievedPosition[exitPriceKey]) {
                            retrievedPosition[exitPriceKey] = exitLong;
                        }
                    } else {
                        retrievedPosition[exitPriceKey] = exitLong;
                    }
                    if (lastCandle.open < retrievedPosition[exitPriceKey] && lastCandle.close < retrievedPosition[exitPriceKey]){
                        finalResult.close = true;
                        finalResult.debug = {
                            [exitPriceKey]: retrievedPosition[exitPriceKey],
                            lastCandleOpen: lastCandle.open,
                            lastCandleClose: lastCandle.close,
                        }
                    }
                }
            }

        }

        if (positionSide === 'SHORT') {
            if (retrievedPosition[initialCorrectSideKey] === false || retrievedPosition[initialCorrectSideKey] === null) {
                if (lastCandle.open < exitShort && lastCandle.close < exitShort) {
                    retrievedPosition[initialCorrectSideKey] = true;
                } else {
                    retrievedPosition[initialCorrectSideKey] = false;
                }
            }

            if (retrievedPosition[initialCorrectSideKey] === true) {
                if (useStoploss === true) {
                    const newStoploss = exitShort + (averageHeight * stoplossSteps)
                    if (!retrievedPosition.stoplossPrice) {
                        retrievedPosition.stoplossPrice = newStoploss;
                        finalResult.stoploss = newStoploss
                    } else {
                        if (retrievedPosition.stoplossPrice > newStoploss) {
                            retrievedPosition.stoplossPrice = newStoploss;
                            finalResult.stoploss = newStoploss
                        }
                    }
                }

                if (!retrievedPosition[exitPriceKey]) {
                    retrievedPosition[exitPriceKey] = exitShort;
                }
                if (retrievedPosition[exitPriceKey]) {
                    if (!dynamic) {
                        if (exitShort < retrievedPosition[exitPriceKey]) {
                            retrievedPosition[exitPriceKey] = exitShort;
                        }
                    } else {
                        retrievedPosition[exitPriceKey] = exitShort;
                    }
                    if (lastCandle.open > retrievedPosition[exitPriceKey] && lastCandle.close > retrievedPosition[exitPriceKey]){
                        finalResult.close = true;
                        finalResult.debug = {
                            [exitPriceKey]: retrievedPosition[exitPriceKey],
                            lastCandleOpen: lastCandle.open,
                            lastCandleClose: lastCandle.close,
                        }
                    }
                }
            }

        }
        await this.storePosition(retrievedPosition);
        return finalResult;
    }

    getAverageHeight(candles) {
        const heights = candles.map(candle => (Math.abs(candle.high - candle.low)));
        const averageHeight = heights.reduce((pre, total) => (total + pre)) / heights.length;
        return averageHeight;
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

    getStorageKey () {
        return `trailer_chandelier${this.isBacktest ? '_bt': ''}`;
    }

    async retrievePosition (entryPrice, positionSide) {
        const storageKey = this.getStorageKey();
        const retrievedPosition = await this.safetyPeriod.storage.get(storageKey);
        if (retrievedPosition && retrievedPosition.hasOwnProperty('entryPrice') && retrievedPosition.hasOwnProperty('positionSide')) {
            if (retrievedPosition.entryPrice === entryPrice && retrievedPosition.positionSide === positionSide) {
                const theTrailerPosition = new TrailerPosition(entryPrice, positionSide);
                const propertyNames = Object.getOwnPropertyNames(retrievedPosition);
                propertyNames.forEach((key) => {
                    theTrailerPosition[key] = retrievedPosition[key];
                });
                return theTrailerPosition;
            }
            return new TrailerPosition(entryPrice, positionSide);
        } else {
            return new TrailerPosition(entryPrice, positionSide);
        }

    }

    async storePosition(data) {
        const storageKey = this.getStorageKey();
        await this.safetyPeriod.storage.set(storageKey, data);
    }
    
    getOptions() {
        return {
            period: '5m',
            length: 100,
            multiplier: 3,
            chandelier: 10,
            double: false,
            multiplier2: 2,
            chandelier2:  22,
            useStoploss: false,
            stoplossSteps: 2, //The steps to give away from the chandelier as stoploss for sudden change
            dynamic: false, //For both movement exit, as chandelier changes - Very critical to be false
        }
    }

}