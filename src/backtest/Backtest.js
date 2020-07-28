/**
 * Copied from github.com/ceoworks Backtest (Github)
 * and retouched by github.com/ifeLight
 */

const TechnicalIndicators = require('technicalindicators');
const {
	defaultBalance, defaultExchangeFee,
	defaultIndicatorPeriod, defaultStopLoss,
	defaultTakeProfit, orderTypes,
	positionTypes,
} = require('./backtestConfig');
const transformCandle = require('./utils/transformCandle');

class Backtest {
    candles;
	exchangeFee;
	indicators;
	indicatorsSettings;
	orders;
	signals;
	state;
    strategy;
    
    constructor({candles, signals, stopLoss, takeProfit, exchangeFee, balanceUSD, indicators, strategy,}) {
		const balance = balanceUSD || defaultBalance;
		this.state = {
			balanceUSD: balance,
			stopLoss: stopLoss || defaultStopLoss,
			takeProfit: takeProfit || defaultTakeProfit,
			positionType: 'none',
			trades: [],
			maximumBalance: balance,
			minimumBalance: balance,
        };
        this.strategy = strategy || (() => {});
		this.candles = candles.map((candle) => transformCandle(candle));
		this.signals = signals || {};
		this.indicators = {};
		this.indicatorsSettings = indicators || [];
		this.exchangeFee = exchangeFee || defaultExchangeFee;
        this.orders = [];
    }

     addSignal({timestamp, price, positionType, orderType}) {
		this.signals[timestamp] = {
			price, positionType, orderType,
		};
    }
    
    calculateIndicators() {
		this.indicatorsSettings.forEach((indicator) => {
			const period = indicator.period || defaultIndicatorPeriod;
			const indicatorKey = indicator.name + period;
			if (!this.indicators[indicatorKey]) {
				this.indicators[indicatorKey] = this.fillBlankIndicatorValues(period);
			}
			const inputCandles = this.candles.map((candle) => candle.close);
			const indicatorInput = {values: inputCandles, period};
			if (indicator.stddev) {
				indicatorInput.stddev = indicator.stddev;
			}
			if (indicator.rsiPeriod && indicator.stochasticPeriod) {
				indicatorInput.rsiPeriod = indicator.rsiPeriod;
				indicatorInput.stochasticPeriod = indicator.stochasticPeriod;
			}
			const calculatedIndicator = TechnicalIndicators[indicator.name](indicatorInput);
			this.indicators[indicatorKey] = this.indicators[indicatorKey].concat(calculatedIndicator);
		});
    }
    
    cancelFillOrKillOrders() {
		this.orders = this.orders.filter((order) => order.fillOrKill !== true);
    }
    
    checkForSignal(candleIndex, candle) {
		const {candleTimestamp} = candle;
		// console.log('this.signals[candleTimestamp]:', this.signals[candleTimestamp]);
		return this.signals[candleTimestamp];
    }
    
    checkStopLossAndTakeProfit(candle) {
		let isStopLossHit = false;
		let isTakeProfitHit = false;
		if (this.state.positionType === 'long') {
			if (this.state.positionEntry > candle.low) {
				const difference = this.state.positionEntry - candle.low;
				const drawdownPercentage = difference / this.state.positionEntry;
				if (drawdownPercentage >= this.state.stopLoss) {
					isStopLossHit = true;
				}
			}
			if (this.state.positionEntry < candle.high) {
				const difference = candle.high - this.state.positionEntry;
				const profitPercentage = difference / this.state.positionEntry;
				if (profitPercentage >= this.state.takeProfit) {
					isTakeProfitHit = true;
				}
			}
		}
		if (this.state.positionType === 'short') {
			if (this.state.positionEntry < candle.high) {
				const difference = candle.high - this.state.positionEntry;
				const profitPercentage = difference / this.state.positionEntry;
				if (profitPercentage >= this.state.stopLoss) {
					isStopLossHit = true;
				}
			}
			if (this.state.positionEntry > candle.low) {
				const difference = this.state.positionEntry - candle.low;
				const drawdownPercentage = difference / this.state.positionEntry;
				if (drawdownPercentage >= this.state.takeProfit) {
					isTakeProfitHit = true;
				}
			}
		}
		if (isStopLossHit || isTakeProfitHit) {
			// console.log(`SL: ${isStopLossHit}, TP: ${isTakeProfitHit}, Low: ${candle.low}, High: ${candle.high}`);
			this.closePosition({isStopLossHit, isTakeProfitHit});
		}
    }
    
    closePosition({isStopLossHit, isTakeProfitHit}) {
		const trade = {
			type: this.state.positionType,
			entry: this.state.positionEntry,
			stopLoss: this.state.stopLoss,
			takeProfit: this.state.takeProfit,
			amount: this.state.balanceUSD < 1000 ? this.state.balanceUSD : 1000,
			close: 0,
			fee: 0,
			profit: 0,
		};
		const isLongPosition = trade.type === 'long';
		let difference;
		if (isStopLossHit) {
			difference = -(trade.entry * trade.stopLoss);
		} else if (isTakeProfitHit) {
			difference = (trade.entry * trade.takeProfit);
		}
		trade.close = isLongPosition ? trade.entry + difference : trade.entry - difference;

		trade.fee = this.exchangeFee * (2 * trade.amount
			+ (Math.abs(trade.close - trade.entry) / trade.entry * trade.amount));
		trade.profit = trade.amount * (difference / trade.entry) - trade.fee;
		// console.log('new trade:', trade, {isStopLossHit, isTakeProfitHit});
		this.state.positionType = 'none';
		this.state.balanceUSD += trade.profit;
		this.state.trades.push(trade);
		this.handleBalanceStats();
		this.logState();
    }
    
    countTrades() {
		const totalTrades = this.state.trades.length;
		const profitTrades = this.state.trades.filter((t) => t.profit > 0).length;
		const unprofitTrades = totalTrades - profitTrades;
		Object.assign(this.state, {totalTrades, profitTrades, unprofitTrades});
	}

	fillBlankIndicatorValues(period = defaultIndicatorPeriod) {
		return Array(period).fill(0);
	}

	getIndicators() {
		return this.indicators;
    }
    
    handleBalanceStats() {
		const {balanceUSD, maximumBalance, minimumBalance} = this.state;
		if (balanceUSD > maximumBalance) {
			this.state.maximumBalance = balanceUSD;
		}
		if (balanceUSD < minimumBalance) {
			this.state.minimumBalance = balanceUSD;
		}
	}

	logState() {
		const logState = JSON.parse(JSON.stringify(this.state));
		logState.trades = logState.trades.length;
		// console.log('new state:', logState);
    }
    
    openPosition(price, positionType = 'long') {
		if (this.state.positionType !== 'none') {
			return;
		}
		// console.log('new position:', price, positionType);
		this.state.positionEntry = price;
		this.state.positionType = positionType;
	}

	placeOrder(price, positionType, orderType, fillOrKill) {
		this.orders.push({
			price, positionType, orderType, fillOrKill,
		});
    }
    
    processSignals(candle) {
		const {candleTimestamp} = candle;
		const signal = this.signals[candleTimestamp];
		if (signal) {
			const {positionType, price, orderType} = signal;
			if (orderType === 'market') {
				this.openPosition(candle.close, positionType);
			} else if (orderType === 'limit') {
				this.placeOrder(price, positionType);
			}
		}
    }
    
    start() {
		this.calculateIndicators();
		this.candles.forEach((candle, candleIndex) => {
			// console.log(`Candle #${candleIndex + 1} (${candle.candleTimestamp}) of ${this.candles.length}`);
			if (this.state.positionType !== 'none') {
				this.checkStopLossAndTakeProfit(candle);
			}
			this.tryToFillOrders(candle);
			this.cancelFillOrKillOrders();
			this.strategy(candleIndex, candle, positionTypes, orderTypes);
			this.processSignals(candle);
		});
		this.countTrades();
		return this.state;
	}

	tryToFillOrders(candle) {
		this.orders = this.orders.reduce((unexecutedOrders, order) => {
			if (order.price >= candle.low && order.price <= candle.high) {
				this.openPosition(order.price, order.positionType);
			}
			return unexecutedOrders;
		}, []);
	}
}

module.exports = Backtest;