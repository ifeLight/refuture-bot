const path = require('path');
const requireAll = require('require-all');

class IndicatorManager {
    constructor() {
        const indicatorDir = path.join(__dirname, '../../', 'strategies','indicators');
        const indicatorObject = requireAll(indicatorDir);
        const indicators = {};
        Object.keys(indicatorObject).forEach((key) => {
            try {
                let theIndicator = new indicatorObject[key]();
                let theIndicatorName = theIndicator.getName();
                indicators[theIndicatorName] = theIndicator;
            } catch (error) {
                logger.error(`indicator Manager: Error loading indicators (${error.message})`);
            }
        })
        this.indicators = indicators;
    }

    find(indicatorName) {
        return this.indicators[indicatorName];
    }

    getList(){
        return this.indicators; // It returns an Object
    }

    async run() {

    }
}