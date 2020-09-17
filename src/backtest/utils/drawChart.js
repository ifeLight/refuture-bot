/**
 * Copied from @ceoworks Backtest (Github)
 *  and modified by @ifeLight (Github)
 */

 const fs = require('fs');
 const path = require('path');
const Chart = require('cli-chart');

module.exports = function drawChart(result) {
	const resultWithoutTrades = {...result, trades: undefined};
	console.log('Backtest result:', resultWithoutTrades);
	fs.writeFileSync(path.join(process.cwd(), 'backtest-result.json'), JSON.stringify(result))
	const chart = new Chart({
		xlabel: 'trades',
		ylabel: 'usd',
		direction: 'y',
		width: result.trades.length,
		height: 35,
		lmargin: 5,
		step: 1,
	});
	result.trades.forEach((trade) => {
		chart.addBar(trade.amount + trade.profit, trade.profit > 0 ? 'green' : 'red');
	});

	chart.draw();
};