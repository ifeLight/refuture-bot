const {
	defaultBalance, defaultExchangeFee,
	defaultIndicatorPeriod, defaultStopLoss,
	defaultTakeProfit, orderTypes,
	positionTypes, defaultLeverage,
} = require('./backtestConfig');

class Backtest {
    constructor({exchangeFee, candles, amount, leverage, useDefaultSafety =true,  stopLoss, takeProfit, safety, strategy, timeMetrics,  parentObject, noInterruption = false}) {
		const balance = amount || defaultBalance;
		const lev = parseInt(leverage) || defaultLeverage;
		const echFee = exchangeFee || defaultExchangeFee;
        this.amount = amount;
        this.state = {
			balance,
			stopLoss: stopLoss || defaultStopLoss,
			takeProfit: takeProfit || defaultTakeProfit,
			positionType: positionTypes.NONE,
			trades: [],
			maximumBalance: balance,
            minimumBalance: balance,
			entryTime: candles[0].time,
			leverage: lev,
			exchangeFee: echFee,
			maximumDrawdown: 0,
			maximumProfit: 0,
			maximumLoss: 0
        };
        this.leverage = lev;
        this.exchangeFee = echFee;
		this.strategy = strategy || (() => {});
		this.safety = safety || (() => {});
		this.timeMetrics = timeMetrics || (() => {});
        this.candles = candles;
		this.parentObject = parentObject;
		this.noInterruption = noInterruption;
		this.useDefaultSafety = useDefaultSafety;
		this.timeState = {
			index: 0
		}
    }

    checkStopLossAndTakeProfit(time, price) {
		let isStopLossHit = false;
		let isTakeProfitHit = false;
		if (this.state.positionType === positionTypes.LONG) {
			if (this.state.positionEntry > price) {
				const difference = this.state.positionEntry - price;
				const drawdownPercentage = (difference / price) * 100;
				if (drawdownPercentage >= this.state.stopLoss) {
					isStopLossHit = true;
				}
			}
			if (this.state.positionEntry < price) {
				const difference = price - this.state.positionEntry;
				const profitPercentage = (difference / this.state.positionEntry) * 100;
				if (profitPercentage >= this.state.takeProfit) {
					isTakeProfitHit = true;
				}
			}
		}
		if (this.state.positionType === positionTypes.SHORT) {
			if (this.state.positionEntry < price) {
				const difference = price - this.state.positionEntry;
				const drawdownPercentage = (difference / this.state.positionEntry) * 100;
				if (drawdownPercentage >= this.state.stopLoss) {
					isStopLossHit = true;
				}
			}
			if (this.state.positionEntry > price) {
				const difference = this.state.positionEntry - price;
				const profitPercentage = (difference / this.state.positionEntry) * 100;
				if (profitPercentage >= this.state.takeProfit) {
					isTakeProfitHit = true;
				}
			}
		}
		if (isStopLossHit || isTakeProfitHit) {
			// console.log(`SL: ${isStopLossHit}, TP: ${isTakeProfitHit}, Low: ${candle.low}, High: ${candle.high}`);
			this.closePositionBasedOnSafety({isStopLossHit, isTakeProfitHit, time});
		}
    }

    createNewEmptyTrade() {
		let defaultSafetyOptions = {};
		if (this.useDefaultSafety) {
			defaultSafetyOptions = {
				stopLoss: this.state.stopLoss,
				takeProfit: this.state.takeProfit,
			}
		}
        return {
            type: this.state.positionType,
            entryTime: this.state.entryTime,
			entry: this.state.positionEntry,
			...defaultSafetyOptions,
            amount: this.amount,
			close: 0,
			fee: 0,
			profit: 0,
		}
    }

    calcFee (amount, entry, close) {
        return  (this.exchangeFee / 100) * ((2 * amount)
        + (Math.abs(close - entry) / entry * amount)) * this.leverage;
    }

    calcProfit (amount, entry, difference, fee) {
        return (amount * ((difference / entry) * this.leverage)) - fee;
    }

    roundupTrade(trade) {
		trade.entryDate = new Date(trade.entryTime).toString();
		trade.closeDate = new Date(trade.closeTime).toString();
        this.state.positionType = positionTypes.NONE;
		this.state.balance += trade.profit;
		trade.profitInPercentage = parseFloat(((trade.profit / this.amount) * 100).toFixed(4));
		this.state.trades.push(trade);
		this.handleMaxLossProfitStat(trade)
		this.handleBalanceStats();
		this.handleDrawdownStats();
		this.logState();
    }
    
    closePositionBasedOnSafety({isStopLossHit, isTakeProfitHit, time}) {
		const trade = this.createNewEmptyTrade();
		const isLongPosition = trade.type === positionTypes.LONG;
		let difference;
		if (isStopLossHit) {
			difference = -(trade.entry * (trade.stopLoss / 100));
		} else if (isTakeProfitHit) {
			difference = (trade.entry * (trade.takeProfit / 100));
        }
		trade.closeTime = time;
		trade.closedBy = isStopLossHit ? 'stoploss' : isTakeProfitHit ? 'take-profit': 'unknown';
		trade.close = isLongPosition ? trade.entry + difference : trade.entry - difference;
		trade.fee = this.calcFee(trade.amount, trade.entry, trade.close); 
		trade.profit = this.calcProfit(trade.amount, trade.entry, difference, trade.fee);
		this.roundupTrade(trade)
    }

    closePositionBasedOnPositionChange(time, price, reason = 'change-position') {
        const trade = this.createNewEmptyTrade();
        let difference;
        trade.close = price;
        trade.fee = this.calcFee(trade.amount, trade.entry, trade.close); 
        const isLongPosition = trade.type === positionTypes.LONG;
        if (isLongPosition) {
            difference = price - trade.entry;
        } else {
            difference = trade.entry - price;
        }
		trade.closeTime = time;
		trade.closedBy = reason;
        trade.profit = this.calcProfit(trade.amount, trade.entry, difference, trade.fee);
        this.roundupTrade(trade)
    }

    countTrades() {
		const totalTrades = this.state.trades.length;
		const profitTrades = this.state.trades.filter((t) => t.profit > 0).length;
		const unprofitTrades = totalTrades - profitTrades;
		Object.assign(this.state, {totalTrades, profitTrades, unprofitTrades});
    }
    
    handleBalanceStats() {
		const {balance, maximumBalance, minimumBalance} = this.state;
		if (balance > maximumBalance) {
			this.state.maximumBalance = balance;
		}
		if (balance < minimumBalance) {
			this.state.minimumBalance = balance;
		}
	}

	handleMaxLossProfitStat(trade) {
		const {profitInPercentage} = trade;
		const {maximumLoss, maximumProfit} = this.state;
		if (profitInPercentage > maximumProfit) {
			this.state.maximumProfit = profitInPercentage
		} if (profitInPercentage < maximumLoss) {
			this.state.maximumLoss = profitInPercentage;
		}
	}

	handleDrawdownStats() {
		const { maximumBalance, maximumDrawdown, balance} = this.state;
		const presentDrawdown = ((maximumBalance - balance) / balance) * 100;
		if (presentDrawdown > maximumDrawdown) {
			this.state.maximumDrawdown = parseFloat(presentDrawdown.toFixed(2));
		}
	}

	logState() {
		const logState = JSON.parse(JSON.stringify(this.state));
		logState.trades = logState.trades.length;
		// console.log('new state:', logState);
	}
	
	closePosition(time, price, reason = 'safety') {
		this.closePositionBasedOnPositionChange(time, price, reason);
	}

    openPosition(time, price, positionType = positionTypes.LONG) {
		let entryTime = time;
		if (this.state.positionType === positionType) {
			return;
		}

		if (this.noInterruption && this.state.positionType !== positionTypes.NONE) {
			return;
		}
        if (this.state.positionType !== positionTypes.NONE) {
            this.closePositionBasedOnPositionChange(time, price);
        }
        if (positionType !== positionTypes.NONE) {
            this.state.positionEntry = price;
            this.state.positionType = positionType;
            this.state.entryTime = entryTime;
		}
	}

	calcPerformanceInTimeStats({periodStartTime, totalLength}) {
		const {index} =  this.timeState;
		this.timeState.totalTime = this.timeState.totalTime || 0;
		this.timeState.totalTime = parseInt(this.timeState.totalTime + parseInt((Date.now() - periodStartTime)));
		const averageTime = ((this.timeState.totalTime / 1000 ) / this.timeState.index).toFixed(2); //in seconds
		const timeRemaining = ((totalLength - this.timeState.index) * (averageTime / 60)).toFixed(2); //In minutes
		this.timeState.index++;
		return {
			totalLength,
			averageTime,
			timeRemaining,
			index
		}
	}

    async start() {
        if (this.candles.length < 2) {
            throw new Error('Candles not sufficient');
        }
        const candlePointUnitTime = parseInt(Math.abs(parseInt(this.candles[0].time) - parseInt(this.candles[1].time)) / 3)
        for (const candle of this.candles) {
            const {open, high, low, close, time } = candle;
            const candlePoints = [
                {price: parseFloat(open), time: time },
                {price: parseFloat(low), time: time + (candlePointUnitTime * 1)},
                {price: parseFloat(high), time: time + (candlePointUnitTime * 2)},
            ]
            for (const candlePoint of candlePoints) {
				let periodStartTime = Date.now();
				this
				const { time, price } = candlePoint;
                if (this.state.positionType !== positionTypes.NONE && this.useDefaultSafety) {
                    this.checkStopLossAndTakeProfit(time, price);
				}
				await this.safety(time, price, this.parentObject);
				await this.strategy(time, price, this.parentObject);

				//Time Perfomance Calc
				const timeMetricsData = this.calcPerformanceInTimeStats({periodStartTime, totalLength: parseInt(this.candles.length * 3) });
				this.timeMetrics(timeMetricsData, this.parentObject)
            }
        }
		this.countTrades();
		return this.state;
	}
}

module.exports = Backtest;