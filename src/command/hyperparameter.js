const path = require('path');
const fs = require('fs');
const hpjs = require('hyperparameters');
const nestedProperty = require('nested-property');
const config = require('config');
const moment = require('moment')

const telegram = require('../providers/Telegram')

const BactestService = require('../services/Backtest');

const HyperModel = require('../models/Hyper');
const BacktestModel = require('../models/Backtest')

module.exports = async function ({configFile}) {
       try {
        const cmdBactestFilePath = configFile ? configFile : 'hyperparameter-config-sample.json';
        const bactestFile = path.join(process.cwd(), cmdBactestFilePath)
        if (!fs.existsSync(bactestFile)) throw new Error(`Instance File: Instance File does not Exist (${bactestFile})`);
        const backtestConfig = require(bactestFile);

        const defaultConfigPath = path.join(process.cwd(), 'hyperparameter-config-sample.json');
        const defaultConfig = require(defaultConfigPath);

        const d = new Date();
        d.setDate(d.getDate() - 3);

        const defaultStartDate = d.toISOString();

        const totalConfig = {...defaultConfig, ...backtestConfig};

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
            useMemory,
            backfillPeriods,
            backfillSpace,
            override = {},
            backtestArgmin = false,
            backtestArgmax = true,
            lastDays,
        } = totalConfig;

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
            endDate:  endDate || new Date().toISOString(),
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
            backfillPeriods: backfillPeriods || "",
            backfillSpace: backfillSpace || 220
        }
        
        if(new Date(parameters.startDate) >= new Date(parameters.endDate)) {
            throw new Error('Start date should be lesser than End Date')
        }

        // Last Days Parameter Overrides all Existing Parameters
        if (lastDays && parseInt(lastDays)) {
            let numberOfDays = parseInt(lastDays)
            const startD = new Date();
            startD.setDate(startD.getDate() - numberOfDays);
            parameters.startDate = startD.toISOString();
            parameters.endDate = new Date().toISOString();
        }

        const backTestService = new BactestService();

        console.time('Hyperparameter running')
        const startTime = new Date();
        let totalRunTime = 0;
        let totalRuns = 0
        const runBactestSection = async (space, parameters) => {
            const runTimeStartTime = Date.now();
            totalRuns++
            const fullParameters = { ...parameters};
            Object.keys(space).forEach(key => {
                nestedProperty.set(fullParameters, key, space[key]);
                console.log(`${key}: ${space[key]}`);
            });
            console.log('------Override----------');
            Object.keys(override).forEach(key => {
                const fetchedValue = nestedProperty.get(fullParameters, override[key]);
                nestedProperty.set(fullParameters, key, fetchedValue);
                console.log(`${key}: ${fetchedValue}`)
            });
            console.log('-------------------------')
            console.count('Hyperparameter Iteration');
            console.timeLog('Hyperparameter running');
            console.log('-------------------------');
            const res = await backTestService.start(fullParameters);
            const runTimeEndTime = Date.now()
            totalRunTime = totalRunTime + (runTimeEndTime - runTimeStartTime);
            const averageRuntime = (totalRunTime / totalRuns) / (1000 * 60) //In Minutes
            console.log(`Average Time: ${averageRuntime.toFixed(2)}mins`)
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
        };
        
        const endTime = new Date();
        const duration = moment(endTime).diff(moment(startTime), 'hours', true);
        console.log('---------------------')
        console.log(`Total Duration: ${duration.toFixed(3)}hours`);
        console.log('---------------------');

        // Run the Argmax and Argmin Backtest & store
        try {
            if (backtestArgmax) {
                console.log('----Backtesting Argmax----')
                const fullParameters = { ...parameters};
                const space = trials.argmax;
                Object.keys(space).forEach(key => {
                    nestedProperty.set(fullParameters, key, space[key]);
                    console.log(`${key}: ${space[key]}`);
                });
                console.log('------Override----------');
                Object.keys(override).forEach(key => {
                    const fetchedValue = nestedProperty.get(fullParameters, override[key]);
                    nestedProperty.set(fullParameters, key, fetchedValue);
                    console.log(`${key}: ${fetchedValue}`)
                });
                const res = await backTestService.start(fullParameters);
                await BacktestModel.create(res);
            }

            if (backtestArgmin) {
                console.log('----Backtesting Argmin----')
                const fullParameters = { ...parameters};
                const space = trials.argmin;
                Object.keys(space).forEach(key => {
                    nestedProperty.set(fullParameters, key, space[key]);
                    console.log(`${key}: ${space[key]}`);
                });
                console.log('------Override----------');
                Object.keys(override).forEach(key => {
                    const fetchedValue = nestedProperty.get(fullParameters, override[key]);
                    nestedProperty.set(fullParameters, key, fetchedValue);
                    console.log(`${key}: ${fetchedValue}`)
                });
                const res = await backTestService.start(fullParameters);
                await BacktestModel.create(res);
            }

        } catch (error) {
            console.error('Error Backtesting Argmax/Argmin')
        }

        let {symbol: symbolP,startDate: startDateP,endDate: endDateP} = parameters;
        const resultInJson = JSON.stringify(resObj);
        const theStorageDir = path.join(process.cwd(), 'var/hyper-results/');
        const fileToCreate = `${symbolP.split('/').join('')}-${startDateP}-${endDateP}.json`;

        if (!fs.existsSync(theStorageDir)) {
            fs.mkdirSync(theStorageDir, 0744);
        }
        fs.writeFileSync(path.join(theStorageDir, fileToCreate), resultInJson);

        //Send a Telegram message
        try {
            let msg = '';
            const heading = `Hyperparameter Tuning \n ------------------------ \n`;
            msg += heading;
            const argmin = trials.argmin;
            const argmax = trials.argmax;
            const safeties = parameters.safeties;
            const indicators = parameters.indicator;
            delete parameters.indicator;
            delete parameters.safeties;
            msg += 'Parameters \n -------------------------- \n';
            Object.keys(parameters).forEach((key) => {
                msg += `${key}: ${parameters[key]} \n`;
            });
            msg += '-------------------------- \n';
            msg += 'Indicator \n -------------------------- \n';
            if (typeof indicators === 'string') {
                msg += indicators.toLowerCase() + " \n";
            } else if (typeof indicators === 'object' && indicators.name) {
                msg+ `Indicator Name: ${indicators.name}`;
                if (indicators.options) {
                    const optionObject = {...indicators.options};
                    Object.keys(optionObject).forEach((key) => {
                        msg += `${key}: ${optionObject[key]} \n`;
                    })
                }
            } else if (Array.isArray(indicators) && typeof indicators[0] === 'string') {
                for (const indicator of indicators) {
                    msg += `${Name}: ${indicator} \n`;
                }
            } else if (Array.isArray(indicators) && typeof indicators[0] === 'object' && indicators[0].name) {
                for (const indicator of indicators) {
                    const {name, options} = indicator;
                    msg += `${Name}: ${name} \n`;
                    const optionObject = {...options};
                    Object.keys(optionObject).forEach((key) => {
                        msg += `${key}: ${optionObject[key]} \n`;
                    })
                    msg += '~~~~~~~~~~~~~~~~~~~ \n';
                }   
            }
            msg += '-------------------------- \n';
            msg += 'Safeties \n -------------------------- \n';
            if (typeof safeties === 'string') {
                msg += safeties.toLowerCase() + " \n";
            } else if (typeof safeties === 'object' && safeties.name) {
                msg+ `Indicator Name: ${safeties.name}`;
                if (safeties.options) {
                    const optionObject = {...safeties.options};
                    Object.keys(optionObject).forEach((key) => {
                        msg += `${key}: ${optionObject[key]} \n`;
                    })
                }
            } else if (Array.isArray(safeties) && typeof safeties[0] === 'string') {
                for (const safety of safeties) {
                    msg += `${Name}: ${safety} \n`;
                }
            } else if (Array.isArray(safeties) && typeof safeties[0] === 'object' && safeties[0].name) {
                for (const safety of safeties) {
                    const {name, options} = safety;
                    msg += `${Name}: ${name} \n`;
                    const optionObject = {...options};
                    Object.keys(optionObject).forEach((key) => {
                        msg += `${key}: ${optionObject[key]} \n`;
                    })
                    msg += '~~~~~~~~~~~~~~~~~~~ \n';
                }   
            }
            msg += '-------------------------- \n';
            msg += 'ArgMin \n -------------------------- \n';
            Object.keys(argmin).forEach((key) => {
                msg += `${key}: ${argmin[key]} \n`;
            });
            msg += '-------------------------- \n';
            msg += 'ArgMax \n -------------------------- \n';
            Object.keys(argmax).forEach((key) => {
                msg += `${key}: ${argmax[key]} \n`;
            });
            const CHAT_ID = config.get('notify.telegram_chat_id');
            await telegram.telegram.sendMessage(CHAT_ID, msg)

        } catch (error) {
            console.error('Error sending a Telegram Notification');
            console.error(error)
        }

        // Replace dot in keys to another
        // Because mongoose keys don't support dot
        function replaceDotFromKeys (obj, toBeRepacedBy='-') {
            const newObj = {}
            Object.keys(obj).forEach(key => {
                const newKey = key.replace(/\./g,toBeRepacedBy);
                newObj[newKey] = obj[key]
            });
            return newObj;
        }

        // Save the Hyper AutoTuning Result to Database
        try {
            const averageRuntime = (totalRunTime / totalRuns) / (1000 * 60) //In Minutes
            const toSaveData = {
                argmin: replaceDotFromKeys(trials.argmin),
                argmax: replaceDotFromKeys(trials.argmax),
                optimizationParameter,
                parameters,
                override: replaceDotFromKeys(override),
                space: replaceDotFromKeys(space),
                duration,
                averageRuntime,
                maximumIteration,
                indicator,
                safeties
            }
            await HyperModel.create(toSaveData);
        } catch (error) {
            console.error('Error saving Hyper to Database')
            console.error(error)
        }
        process.exit();
       } catch (error) {
           console.log(error);
           process.exit();
       }
}
