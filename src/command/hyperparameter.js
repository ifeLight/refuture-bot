const path = require('path');
const fs = require('fs');
const hpjs = require('hyperparameters');
const nestedProperty = require('nested-property');

const BactestService = require('../services/Backtest');

module.exports = async function ({configFile}) {
       try {
        const cmdBactestFilePath = configFile ? configFile : 'hyperparameter-config-sample.json';
        const bactestFile = path.join(process.cwd(), cmdBactestFilePath)
        if (!fs.existsSync(bactestFile)) throw new Error(`Instance File: Instance File does not Exist (${bactestFile})`);
        const backtestConfig = require(bactestFile);

        const defaultConfigPath = path.join(process.cwd(), 'hyperparameter-config-sample.json');
        const defaultConfig = require(defaultConfigPath);

        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 1);

        const config = {...defaultConfig, ...backtestConfig};

        let {
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
            maximumIteration = 100,
            space: spaceObj,
            safeties,
            useDefaultSafety,
            noInterruption,
            period,
            takeProfit,
            stopLoss,
            toLog,
            useMemory
        } = config;

        spaceObj = {...spaceObj}
        const space = {};
        Object.keys(spaceObj).forEach((key) => {
            const h = hpjs; // its for the function in eval
            space[key] = eval(spaceObj[key]);
        })

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
            noInterruption: noInterruption === false ? false: true,
            safeties: safeties || [],
            useDefaultSafety: useDefaultSafety === false ? false: true,
            toLog: toLog === true ? true: false,
            period: period || '5m',
            takeProfit: takeProfit || 4,
            stopLoss: stopLoss || 2,
            useMemory: useMemory === true ? true: false,
        }
        
        if(new Date(parameters.startDate) >= new Date(parameters.endDate)) {
            throw new Error('Start date should be lesser than End Date')
        }

        const backTestService = new BactestService();

        const runBactestSection = async (space, parameters) => {
            const fullParameters = { ...parameters};
            Object.keys(space).forEach(key => {
                nestedProperty.set(fullParameters, key, space[key]);
                console.log(`${key}: ${space[key]}`);
            });
            const res = await backTestService.start(fullParameters);
            return res[optimizationParameter]
        }

        const backtestOptimizer = async(space, {parameters}) => {
            const res = await runBactestSection(space, parameters);
            return { loss: res, status: hpjs.STATUS_OK };
        }

        const trials = await hpjs.fmin( backtestOptimizer, space, hpjs.search.randomSearch, maximumIteration,
            { rng: new hpjs.RandomState(Math.ceil(Math.random() * 1000000)), parameters }
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
