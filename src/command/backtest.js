const path = require('path');
const fs = require('fs');

const BactestService = require('../services/Backtest');

module.exports = async function ({
    configFile,
    amount,
    takeProfit,
    stopLoss,
    startDate,
    endDate,
    exchange,
    symbol,
    leverage,
    period,
    orderType,
    fee,
    safety,
    usedefaultsafety: useDefaultSafety,
    nointerruption: noInterruption,
    backfillperiods: backfillPeriods,
    indicator, 
    }) {
        const cmdBactestFilePath = configFile ? configFile : 'backtest-config-sample.json';
        const bactestFile = path.join(process.cwd(), cmdBactestFilePath)
        if (!fs.existsSync(bactestFile)) throw new Error(`Instance File: Instance File does not Exist (${bactestFile})`);
        const backtestConfig = JSON.parse(fs.readFileSync(bactestFile).toString());
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 1);

        const parameters = {
            amount: amount || backtestConfig.amount || 1000,
            takeProfit: takeProfit || backtestConfig.takeProfit || 0.3,
            stopLoss: stopLoss || backtestConfig.stopLoss || 0.2,
            startDate: startDate || backtestConfig.startDate || defaultStartDate,
            endDate: endDate || backtestConfig.endDate || Date.now(),
            exchange: exchange || backtestConfig.exchange || 'binance',
            symbol: symbol || backtestConfig.symbol || 'BTC/USDT',
            leverage: leverage || backtestConfig.leverage || 1,
            indicator: indicator || backtestConfig.indicator || 'bollingerSimple',
            period: period || backtestConfig.period || '15m',
            orderType: orderType || backtestConfig.orderType || 'market',
            fee: fee || backtestConfig.fee,
            noInterruption: noInterruption || backtestConfig.noInterruption || false,
            safeties: safety || backtestConfig.safeties || [],
            useDefaultSafety: useDefaultSafety ? useDefaultSafety : backtestConfig.hasOwnProperty('useDefaultSafety') && backtestConfig.useDefaultSafety == false ? backtestConfig.useDefaultSafety : true,
            backfillPeriods: backfillPeriods || backtestConfig.backfillPeriods || backtestConfig.period || period|| '15m',
        }
        if(new Date(parameters.startDate) >= new Date(parameters.endDate)) {
            throw new Error('Start date should be lesser than End Date')
        }
        
        try {
            const backTestService = new BactestService(parameters);
            await backTestService.start();
            process.exit();
        } catch (error) {
            console.error("Backtest Service Failed while running");
            console.error(error.message);
        }
}
