const { chandelierexit } = require('technicalindicators');

class TrailerPosition {
    constructor (entryPrice, positionSide = 'LONG') {
        this.positionSide = positionSide;
        this.entryPrice = entryPrice;
        this.stoplossPrice = null;
        this.initialCorrectSide = null;
        this.exitPrice = null;
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
            this.presentPrice = safetyPeriod.getLastPrice();
            const isBacktest = (safetyPeriod.getEnvironment()).backtest;
            this.isBacktest = isBacktest;
            this.safetyPeriod = safetyPeriod;
            const candles = indicatorPeriod.indicatorBuilder.get('candles');
            const presentTime = indicatorPeriod.getTime();
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
        let safetyResult = this.safetyPeriod.createEmptySignal();
        const retrievedPosition = await this.retrievePosition(entryPrice, positionSide);
        const presentTime = this.safetyPeriod.getTime();
        const presentPrice = this.presentPrice;
        const {multiplier, chandelier: chandelierPeriod, useStoploss, stoplossSteps, dynamic} = this.options;
        let input = this.generateCandlesticksInputs(candles);
        input = {...input, multiplier, period: chandelierPeriod}
        const result = chandelierexit(input);
        const lastResult = result[result.length - 1];
        const lastCandle = candles[candles.length - 1];
        const lastFiveCandles = candles.slice(candles.length - 5, candles.length);
        const averageHeight = this.getAverageHeight(lastFiveCandles)
        const {exitLong, exitShort} = lastResult;

        if (positionSide === 'LONG') {
            if (retrievedPosition.initialCorrectSide === false || retrievedPosition.initialCorrectSide === null) {
                if (lastCandle.open > exitLong && lastCandle.close > exitLong) {
                    retrievedPosition.initialCorrectSide = true;
                } else {
                    retrievedPosition.initialCorrectSide = false;
                }
            }

            if (retrievedPosition.initialCorrectSide === true) {
                if (useStoploss === true) {
                    const newStoploss = exitLong - (averageHeight * stoplossSteps)
                    if (!retrievedPosition.stoplossPrice) {
                        retrievedPosition.stoplossPrice = newStoploss;
                        safetyResult.setOrderAdvice('stoploss', newStoploss);
                    } else {
                        if (retrievedPosition.stoplossPrice < newStoploss) {
                            retrievedPosition.stoplossPrice = newStoploss;
                            safetyResult.setOrderAdvice('stoploss', newStoploss);
                        }
                    }
                }

                if (!retrievedPosition.exitPrice) {
                    retrievedPosition.exitPrice = exitLong;
                }
                if (retrievedPosition.exitPrice) {
                    if (!dynamic) {
                        if (exitLong > retrievedPosition.exitPrice) {
                            retrievedPosition.exitPrice = exitLong;
                        }
                    } else {
                        retrievedPosition.exitPrice = exitLong;
                    }
                    if (lastCandle.open < retrievedPosition.exitPrice && lastCandle.close < retrievedPosition.exitPrice){
                        safetyResult.setSignal('close');
                        safetyResult.mergeDebug({
                            exitPrice: retrievedPosition.exitPrice,
                            lastCandleOpen: lastCandle.open,
                            lastCandleClose: lastCandle.close,
                        });
                    }
                }
            }

        }

        if (positionSide === 'SHORT') {
            if (retrievedPosition.initialCorrectSide === false || retrievedPosition.initialCorrectSide === null) {
                if (lastCandle.open < exitShort && lastCandle.close < exitShort) {
                    retrievedPosition.initialCorrectSide = true;
                } else {
                    retrievedPosition.initialCorrectSide = false;
                }
            }

            if (retrievedPosition.initialCorrectSide === true) {
                if (useStoploss === true) {
                    const newStoploss = exitShort + (averageHeight * stoplossSteps)
                    if (!retrievedPosition.stoplossPrice) {
                        retrievedPosition.stoplossPrice = newStoploss;
                        safetyResult.setOrderAdvice('stoploss', newStoploss);
                    } else {
                        if (retrievedPosition.stoplossPrice > newStoploss) {
                            retrievedPosition.stoplossPrice = newStoploss;
                            safetyResult.setOrderAdvice('stoploss', newStoploss);
                        }
                    }
                }

                if (!retrievedPosition.exitPrice) {
                    retrievedPosition.exitPrice = exitShort;
                }
                if (retrievedPosition.exitPrice) {
                    if (!dynamic) {
                        if (exitShort < retrievedPosition.exitPrice) {
                            retrievedPosition.exitPrice = exitShort;
                        }
                    } else {
                        retrievedPosition.exitPrice = exitShort;
                    }
                    if (lastCandle.open > retrievedPosition.exitPrice && lastCandle.close > retrievedPosition.exitPrice){
                        safetyResult.setSignal('close');
                        safetyResult.mergeDebug({
                            exitPrice: retrievedPosition.exitPrice,
                            lastCandleOpen: lastCandle.open,
                            lastCandleClose: lastCandle.close,
                        });
                    }
                }
            }

        }
        await this.storePosition(retrievedPosition);
        return safetyResult;
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

    async retrievePosition (entryPrice, positionSide) {
        const storageKey = `trailer_chandelier_${this.isBacktest ? '_bt': ''}`;
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
        const storageKey = `trailer_chandelier_${this.isBacktest ? '_bt': ''}`;
        await this.safetyPeriod.storage.set(storageKey, data);
    }
    
    getOptions() {
        return {
            period: '5m',
            length: 100,
            multiplier: 3,
            chandelier: 22,
            useStoploss: true,
            stoplossSteps: 2, //The steps to give away from the chandelier as stoploss for sudden change
            dynamic: false, //For both movement exit, as chandelier changes
        }
    }

}