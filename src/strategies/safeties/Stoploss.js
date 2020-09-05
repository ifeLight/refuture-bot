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
        const presentPrice = safetyPeriod.getLastPrice();
        if (isFutures) {
            const positions = await getPositions();
            if (positions && Array.isArray(positions) && positions.length > 0) {
                const position = positions[0];
                const {positionSide, entryPrice} = position;
                const leastLongSidePrice = (entryPrice - (entryPrice * (percentage/100)));
                const leastShortSidePrice = (entryPrice + (entryPrice * (percentage/100)));
                if (positionSide === 'LONG') {
                    if (presentPrice < leastLongSidePrice) {
                        return safetyPeriod.createSignal('close', {
                            entryPrice,
                            presentPrice
                        })
                    }
                    return (safetyPeriod.createEmptySignal()).setOrderAdvice('close', leastLongSidePrice);
                }
                if (positionSide === 'SHORT') {
                    if (presentPrice > leastShortSidePrice) {
                        return safetyPeriod.createSignal('close', {
                            entryPrice,
                            presentPrice
                        })
                    }
                    return (safetyPeriod.createEmptySignal()).setOrderAdvice('close', leastShortSidePrice);
                }
            }
        }

        if (!isFutures) {
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
                const leastPrice = (entryPrice - (entryPrice * (percentage/100)))
                if (presentPrice < leastPrice) {
                    return safetyPeriod.createSignal('close', {
                        entryPrice,
                        presentPrice
                    }) 
                }
                return (safetyPeriod.createEmptySignal()).setOrderAdvice('close', leastPrice);
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