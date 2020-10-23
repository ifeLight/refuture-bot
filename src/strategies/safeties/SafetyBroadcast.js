const technicalindicators = require('technicalindicators')

class BroadcastPosition {
    constructor (entryPrice, positionSide = 'LONG') {
        this.positionSide = positionSide;
        this.entryPrice = entryPrice;
        this.stoplossPrice = undefined;
        this.takeProfitPrice = undefined;
    }
}

module.exports = class SafetyBroadcast {
    getName() {
        return 'safety-broadcast';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
    }

    buildIndicators(indicatorBuilder, options) {
        
    }

    async period(safetyPeriod, options, strat) {
        try {
            this.options = options;
            const isFutures = safetyPeriod.isFutures();
            this.presentPrice = await safetyPeriod.getLastPrice();
            const isBacktest = (safetyPeriod.getEnvironment()).backtest;
            this.isBacktest = isBacktest;
            this.safetyPeriod = safetyPeriod;
            if (isFutures || isBacktest) {
                const positions = await safetyPeriod.getPositions();
                if (positions && Array.isArray(positions) && positions.length > 0) {
                    const position = positions[0];
                    const {positionSide, entryPrice} = position;
                    if (positionSide === 'LONG') {
                        const res = await this.handleLongPosition(entryPrice)
                        return res;
                    }
                    if (positionSide === 'SHORT') {
                        const res = await this.handleShortPosition(entryPrice)
                        return res;
                    }
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
                    const res = await this.handleLongPosition(entryPrice)
                    return res;
                }

            }
            return safetyPeriod.createEmptySignal();
        } catch (error) {
            console.error(error);
        }
    }



    async handleShortPosition (entryPrice) {
        let safetyResult = this.safetyPeriod.createEmptySignal();
        let positionSide = 'SHORT';
        const retrievedPosition = await this.retrievePosition(entryPrice, positionSide);
        const presentTime = this.safetyPeriod.getTime();
        const presentPrice = this.presentPrice;
        if (this.options.stoploss === true) {
            const fetchedSafetyBroadcast = await this.fetchSafetyBroadcast(positionSide, 'stoploss');
            if (fetchedSafetyBroadcast) {
                if (!retrievedPosition.stoplossPrice) {
                    // console.log('came here')
                    const withinTimeRange = (presentTime -  fetchedSafetyBroadcast.time) < (this.options.maxTime * 1000 * 60);
                    const allowedPrice = presentPrice < parseFloat(fetchedSafetyBroadcast.price);
                    // console.log(`//present time: ${presentTime} - broadcast time: ${fetchedSafetyBroadcast.time}`);
                    // console.log(`Present price: ${presentPrice} - Broadcast Price: ${fetchedSafetyBroadcast.price}`)
                    // console.log(`Within Range: ${withinTimeRange} - Allowed Price: ${allowedPrice}`)
                    if (withinTimeRange && allowedPrice) {
                        // console.log('Inner')
                        retrievedPosition.stoplossPrice = fetchedSafetyBroadcast.price;
                    }
                }
                if (retrievedPosition.stoplossPrice) {
                    if (presentPrice > retrievedPosition.stoplossPrice) {
                        safetyResult.setSignal('close');
                        safetyResult.mergeDebug({
                            closingBy: 'Stoploss Hit',
                            currentPrice:  presentPrice,
                            stoplossPrice: retrievedPosition.stoplossPrice,
                            positionSide
                        })
                    } else {
                        safetyResult.setOrderAdvice('stoploss', retrievedPosition.stoplossPrice)
                    }
                }
            };
            // console.log(fetchedSafetyBroadcast)
        }

        if (this.options.takeProfit === true) {
            const fetchedSafetyBroadcast = await this.fetchSafetyBroadcast(positionSide, 'take_profit');
            if (fetchedSafetyBroadcast) {
                if (!retrievedPosition.takeProfitPrice) {
                    const withinTimeRange = (presentTime -  fetchedSafetyBroadcast.time) < (this.options.maxTime * 1000 * 60);
                    const allowedPrice = presentPrice > parseFloat(fetchedSafetyBroadcast.price);
                    if (withinTimeRange && allowedPrice) {
                        retrievedPosition.takeProfitPrice = fetchedSafetyBroadcast.price;
                    }
                }
                if (retrievedPosition.takeProfitPrice) {
                    if (presentPrice < retrievedPosition.takeProfitPrice) {
                        safetyResult.setSignal('close');
                        safetyResult.mergeDebug({
                            closingBy: 'Take Profit Hit',
                            currentPrice:  presentPrice,
                            takeProfitPrice: retrievedPosition.takeProfitPrice,
                            positionSide
                        })
                    } else {
                        if (safetyResult.getSignal() && safetyResult.getSignal() !== 'take_profit')  {
                            // Stoploss is taken of higher preference to Take Profit
                        } else {
                            safetyResult.setOrderAdvice('take_profit', retrievedPosition.takeProfitPrice);
                        }
                    }
                }
            };
        }
       
        // console.log(retrievedPosition);
        await this.storePosition(retrievedPosition);
        return safetyResult;
    }

    async handleLongPosition (entryPrice) {
        let safetyResult = this.safetyPeriod.createEmptySignal();
        let positionSide = 'LONG';
        const retrievedPosition = await this.retrievePosition(entryPrice, positionSide);
        const presentTime = this.safetyPeriod.getTime();
        const presentPrice = this.presentPrice;
        if (this.options.stoploss === true) {
            const fetchedSafetyBroadcast = await this.fetchSafetyBroadcast(positionSide, 'stoploss');
            if (fetchedSafetyBroadcast) {
                if (!retrievedPosition.stoplossPrice) {
                    const withinTimeRange = (presentTime -  fetchedSafetyBroadcast.time) < (this.options.maxTime * 1000 * 60);
                    const allowedPrice = presentPrice > parseFloat(fetchedSafetyBroadcast.price);
                    if (withinTimeRange && allowedPrice) {
                        retrievedPosition.stoplossPrice = fetchedSafetyBroadcast.price;
                    }
                }
                if (retrievedPosition.stoplossPrice) {
                    if (presentPrice < retrievedPosition.stoplossPrice) {
                        safetyResult.setSignal('close');
                        safetyResult.mergeDebug({
                            closingBy: 'Stoploss Hit',
                            currentPrice:  presentPrice,
                            stoplossPrice: retrievedPosition.stoplossPrice,
                            positionSide
                        })
                    } else {
                        safetyResult.setOrderAdvice('stoploss', retrievedPosition.stoplossPrice)
                    }
                }
            };
        }

        if (this.options.takeProfit === true) {
            const fetchedSafetyBroadcast = await this.fetchSafetyBroadcast(positionSide, 'take_profit');
            if (fetchedSafetyBroadcast) {
                if (!retrievedPosition.takeProfitPrice) {
                    const withinTimeRange = (presentTime -  fetchedSafetyBroadcast.time) < (this.options.maxTime * 1000 * 60);
                    const allowedPrice = presentPrice < parseFloat(fetchedSafetyBroadcast.price);
                    if (withinTimeRange && allowedPrice) {
                        retrievedPosition.takeProfitPrice = fetchedSafetyBroadcast.price;
                    }
                }
                if (retrievedPosition.takeProfitPrice) {
                    if (presentPrice > retrievedPosition.takeProfitPrice) {
                        safetyResult.setSignal('close');
                        safetyResult.mergeDebug({
                            closingBy: 'Take Profit Hit',
                            currentPrice:  presentPrice,
                            takeProfitPrice: retrievedPosition.takeProfitPrice,
                            positionSide
                        })
                    } else {
                        if (safetyResult.getSignal() && safetyResult.getSignal() !== 'take_profit')  {
                            // Stoploss is taken of higher preference to Take Profit
                        } else {
                            safetyResult.setOrderAdvice('take_profit', retrievedPosition.takeProfitPrice)
                        }
                    }
                }
            };
        }
        await this.storePosition(retrievedPosition);
        return safetyResult;
    }

    async retrievePosition (entryPrice, positionSide) {
        const storageKey = `safety_broadcast_${this.isBacktest ? '_bt': ''}`;
        const retrievedPosition = await this.safetyPeriod.storage.get(storageKey);
        if (retrievedPosition && retrievedPosition.hasOwnProperty('entryPrice') && retrievedPosition.hasOwnProperty('positionSide')) {
            if (retrievedPosition.entryPrice === entryPrice && retrievedPosition.positionSide === positionSide) {
                const theBroadcastPosition = new BroadcastPosition(entryPrice, positionSide);
                const propertyNames = Object.getOwnPropertyNames(retrievedPosition);
                propertyNames.forEach((key) => {
                    theBroadcastPosition[key] = retrievedPosition[key];
                });
                return theBroadcastPosition;
            }
            return new BroadcastPosition(entryPrice, positionSide);
        } else {
            return new BroadcastPosition(entryPrice, positionSide);
        }

    }

    async storePosition(data) {
        const storageKey = `safety_broadcast_${this.isBacktest ? '_bt': ''}`;
        await this.safetyPeriod.storage.set(storageKey, data);
    }

    async fetchSafetyBroadcast (positionSide ='LONG', type= 'stoploss') {
        const result = await this.safetyPeriod.getSafetyBroadcast(positionSide, type);
        return result;
    }
    
    getOptions() {
        return {
            stoploss: true,
            takeProfit: true,
            maxTime: 5 //In minutes
        }
    }

}