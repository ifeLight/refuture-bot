const path = require('path');
const requireAll = require('require-all');

class WatchdogManager {
    constructor() {
        const watchdogDir = path.join(__dirname, '../../', 'strategies','watchdogs');
        const watchdogObject = requireAll(watchdogDir);
        const watchdogs = {};
        Object.keys(watchdogObject).forEach((key) => {
            try {
                let theWatchdog = new watchdogObject[key]();
                let theWatchdogName = theWatchdog.getName();
                watchdogs[theWatchdogName] = theWatchdog;
            } catch (error) {
                logger.error(`Watchdog Manager: Error loading Watchdogs (${error.message})`);
            }
        })
        this.watchdogs = watchdogs;
    }

    find(watchdogName) {
        return this.watchdogs[watchdogName];
    }

    getList(){
        return this.watchdogs; // It returns an Object
    }

    async run() {

    }
}