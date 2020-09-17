const { Command } = require('commander');

const tradeCommand = require('./src/command/trade');
const backtestCommand = require('./src/command/backtest');

const program = new Command();
program.version('0.0.1');

program
    .name('Refuture')
    .description("A algorithmic trading bot by Ifelight");


program
    .command('trade')
    .description('Run the Live trading Service')
    .option('-i, --instance <value>', 'the instance file')
    .action(async (cmdObj) => {
        const { instance: instanceFilePath } = cmdObj
        await tradeCommand(instanceFilePath);
    })

 program
    .command('backtest')
    .description('Run a backtest of a Strategy')
    .option('-e, --exchange <value>', 'the exchange to use')
    .option('-s, --symbol <value>', 'the symbol of the pair')
    .option('-I, --indicator <value>', 'the indicator to backtest')
    .option('-r, --profit <value>', 'the take pofit in percentage')
    .option('-o, --loss <value>', 'the stop loss in percentage')
    .option('-a, --amount <value>', 'the amount to start with')
    .option('-c, --config <value>', 'the path to the config file')
    .option('-x, --start <value>', 'the beginning date of the backest period')
    .option('-y, --end <value>', 'the end date of the backtest period')
    .option('-z, --leverage <value>', 'the leverage for futures trading')
    .option('-p, --period <value>', 'the period to run every tick')
    .option('-f, --fee <value>', 'the fee for each completed order')
    .option('-n, --nointerruption <value>', 'no interruption when there is a trade')
    .option('-S, --safety <value>', 'select the safety to be used')
    .option('-D, --usedefaultsafety <value>', 'use default safety')
    .option('-B, --backfillperiods <value>', 'set some periods to backfill, should seperated by comma')
    .action(async (cmdObj) => {
        const { config: configFile, profit: takeProfit, loss: stopLoss, end: endDate, start: startDate } = cmdObj;
        await backtestCommand({
            ...cmdObj,
            takeProfit,
            configFile,
            stopLoss,
            startDate,
            endDate
        });
    })
 
program.parse(process.argv);