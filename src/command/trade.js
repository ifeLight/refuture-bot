const path = require('path');
const fs = require('fs');

const Trader = require('../services/Trader');

module.exports = async function (instanceFilePath) {
    const cmdInstanceFilePath = instanceFilePath ? instanceFilePath : 'instance-sample.json';
    const instanceFile = path.join(process.cwd(), cmdInstanceFilePath)
    if (!fs.existsSync(instanceFile)) throw new Error(`Instance File: Instance File does not Exist (${instanceFile})`);
    const instances = JSON.parse(fs.readFileSync(instanceFile).toString())
    if (!Array.isArray(instances)) {
        throw new Error('Bad Instance File');
    }
    
    async function runTradeServices (instances) {
        const tradeService = new Trader();
        tradeService.start(instances);
    };

    try {
        await runTradeServices(instances);
    } catch (error) {
        console.error("Trade Service Failed while running")
    }
}
