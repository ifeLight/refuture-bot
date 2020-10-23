const technicalindicators = require('technicalindicators')

module.exports = class FixedStopLoss {
    getName() {
        return 'stoploss';
    }

    async init(storage, period) {
        // Meant for prebuilding Indicator Strategies
    }

    buildIndicators(indicatorBuilder, options) {
        
    }

    async period(safetyPeriod, options, strat) {
        const percentage = options.percentage;
        const isFutures = safetyPeriod.isFutures();
        const presentPrice = await safetyPeriod.getLastPrice();
        const isBacktest = (safetyPeriod.getEnvironment()).backtest;
        let signalResult = safetyPeriod.createEmptySignal();
        if (isFutures || isBacktest) {
            const positions = await safetyPeriod.getPositions();
            if (positions && Array.isArray(positions) && positions.length > 0) {
                const position = positions[0];
                const {positionSide, entryPrice} = position;
                const leastLongSidePrice = (entryPrice - (entryPrice * (percentage/100)));
                const leastShortSidePrice = (entryPrice + (entryPrice * (percentage/100)));
                if (positionSide === 'LONG') {
                    if (presentPrice < leastLongSidePrice) {
                        signalResult.setSignal('close');
                        signalResult.mergeDebug({
                            entryPrice,
                            presentPrice
                        })
                        return signalResult;
                    }
                    signalResult.setOrderAdvice('stoploss', leastLongSidePrice);
                    return signalResult;
                }
                if (positionSide === 'SHORT') {
                    if (presentPrice > leastShortSidePrice) {
                        signalResult.setSignal('close');
                        signalResult.mergeDebug({
                            entryPrice,
                            presentPrice
                        })
                        return signalResult;
                    }
                    signalResult.setOrderAdvice('stoploss', leastShortSidePrice)
                    return signalResult;
                }
            }
        }

        if (!isFutures && !isBacktest) {
            const {amount, currency_amount} = strat.trade;
            let tradeAmount = amount ? Number(amount) : Number(presentPrice) / Number(currency_amount);
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
                const leastPrice = (entryPrice - (entryPrice * (percentage/100)))
                if (presentPrice < leastPrice) {
                    signalResult.setSignal('close');
                        signalResult.mergeDebug({
                            entryPrice,
                            presentPrice
                        })
                        return signalResult;
                }
                signalResult.setOrderAdvice('close', leastPrice)
                return signalResult;
            }

        }
        return safetyPeriod.createEmptySignal();
    }
    
    getOptions() {
        return {
            percentage: 5
        }
    }

}