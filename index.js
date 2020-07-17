const { Command } = require('commander');

const tradeCommand = require('./src/command/Trade')

const program = new Command();
program.version('0.0.1');

program
    .name('Refuture')
    .description("A algorithmic trading bot by Ifelight");
    // .option('-i, --instance', 'the indtance file')
    // .option('-t, --trade', 'run the live trading service');


program
    .command('trade')
    .description('Run the Live trading Service')
    .option('-i, --instance <value>', 'the instance file')
    .action((cmdObj) => {
        const { instance: instanceFilePath } = cmdObj
        tradeCommand(instanceFilePath);
    })

 program
    .command('backtest <filePath>')
    .description('Run a backtest of a Strategy')
    .action((cmdObj) => {
        const { instance: instanceFilePath } = cmdObj
        console.info('Backtest ' + instanceFilePath);
    })
 
program.parse(process.argv);