const {macd} = require('technicalindicators')

module.exports = class MacdExit {
    getName() {
        return 'macd-exit';
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
        this.options = options;
        this.safetyPeriod = safetyPeriod;
        const presentTime = this.safetyPeriod.getTime();
        const isFutures = safetyPeriod.isFutures();
        const isBacktest = (safetyPeriod.getEnvironment()).backtest;
        const candles = safetyPeriod.indicatorBuilder.get('candles');
        //Remove the last incomplete candle
        let incompleteCandle;
        if (!this.isLastCandleComplete(candles, presentTime)) {
            incompleteCandle = candles.pop();
        }
        if (isFutures || isBacktest) {
            const positions = await safetyPeriod.getPositions();
            if (positions && Array.isArray(positions) && positions.length > 0) {
                const position = positions[0];
                const {positionSide} = position;
               return this.calculateSignal(candles, positionSide)
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
                return this.calculateSignal(candles, 'LONG')
            }

        }
        return safetyPeriod.createEmptySignal();
    }

    calculateSignal (candles, positionSide) {
        const {fast: fastPeriod, slow: slowPeriod, signal: signalPeriod} = this.options;
        const theClosePrices = candles.map((candle) => candle.close);
        const input = {
            values: theClosePrices,
            fastPeriod,
            slowPeriod,
            signalPeriod,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        }
        const res = macd(input);
        const lastValue = res[res.length - 1];
        if (positionSide === 'LONG') {
            if (lastValue.signal < lastValue.MACD) {
                return this.safetyPeriod.createSignal('close', {
                    indicator: 'macd',
                    signalValue: lastValue.signal,
                    macdValue: lastValue.MACD
                });
            }
        }
        if (positionSide === 'SHORT') {
            if (lastValue.signal > lastValue.MACD) {
                return this.safetyPeriod.createSignal('close', {
                    indicator: 'macd',
                    signalValue: lastValue.signal,
                    macdValue: lastValue.MACD
                });
            }
        } 
        return this.safetyPeriod.createEmptySignal();
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
    
    getOptions() {
        return {
            fast: 12,
            slow: 26,
            signal: 9,
            period: '5m',
            length: 100,
        }
    }

}