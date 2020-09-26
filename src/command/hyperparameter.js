const path = require('path');
const fs = require('fs');
const hpjs = require('hyperparameters')

const BactestService = require('../services/Backtest');

module.exports = async function ({
    configFile,
    }) {
       try {
        const cmdBactestFilePath = configFile ? configFile : 'hyperparameter-config-sample.json';
        const bactestFile = path.join(process.cwd(), cmdBactestFilePath)
        if (!fs.existsSync(bactestFile)) throw new Error(`Instance File: Instance File does not Exist (${bactestFile})`);
        const backtestConfig = JSON.parse(fs.readFileSync(bactestFile).toString());

        const defaultConfigPath = path.join(process.cwd(), 'hyperparameter-config-sample.json');
        const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath).toString());

        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 1);

        const config = {...defaultConfig, ...backtestConfig};
        const {
            amount,
            startDate,
            endDate,
            symbol,
            exchange,
            leverage,
            indicator,
            orderType,
            fee,
            optimize,
            maximumIteration = 100
        } = config;

        const space = {
            period: hpjs.choice(['5m','15m', '30m']),
            takeProfit: hpjs.quniform(0.5, 10, 0.5),
            stopLoss: hpjs.quniform(0.5, 10, 0.5)
        }

        const optimizationParameter = optimize || 'balance';

        const parameters = {
            amount: amount ||  1000,
            startDate:  startDate || defaultStartDate,
            endDate:  endDate || Date.now(),
            exchange:  exchange || 'binance',
            symbol: symbol || 'BTC/USDT',
            leverage: leverage || 1,
            indicator:  indicator || 'trendline-reversal',
            orderType: orderType || 'market',
            fee: fee || 0.01,
            noInterruption: true,
            safeties: "",
            useDefaultSafety: true,
            toLog: false
        }
        
        if(new Date(parameters.startDate) >= new Date(parameters.endDate)) {
            throw new Error('Start date should be lesser than End Date')
        }

        const backTestService = new BactestService();

        const runBactestSection = async (space, parameters) => {
            const fullParameters = {...space, ...parameters};
            const {stopLoss, takeProfit, period} = fullParameters;
            console.log(`StopLoss: ${stopLoss} - TakeProfit: ${takeProfit} - Period: ${period}`)
            const res = await backTestService.start(fullParameters);
            return res[optimizationParameter]
        }

        const backtestOptimizer = async(space, {parameters}) => {
            const res = await runBactestSection(space, parameters);
            return { loss: res, status: hpjs.STATUS_OK };
        }

        const trials = await hpjs.fmin( backtestOptimizer, space, hpjs.search.randomSearch, maximumIteration,
            { rng: new hpjs.RandomState(654321), parameters }
          );
        
        const resObj ={
            argmin: trials.argmin,
            argmax: trials.argmax,
            optimizationParameter,
            ...parameters
        }

        let {symbol: symbolP,startDate: startDateP,endDate: endDateP} = parameters;
        const resultInJson = JSON.stringify(resObj);
        const theStorageDir = path.join(process.cwd(), 'var/hyper-results/');
        const fileToCreate = `${symbolP.split('/').join('')}-${startDateP}-${endDateP}.json`;

        if (!fs.existsSync(theStorageDir)) {
            fs.mkdirSync(theStorageDir, 0744);
            fs.writeFileSync(path.join(theStorageDir, fileToCreate), resultInJson);
        }
        process.exit();
       } catch (error) {
           console.log(error);
           process.exit();
       }
}
