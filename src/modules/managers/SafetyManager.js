const path = require('path');
const requireAll = require('require-all');

class SafetyManager {
    constructor() {
        const safetyDir = path.join(__dirname, '../../', 'strategies','safeties');
        const safetyObject = requireAll(safetyDir);
        const safeties = {};
        Object.keys(safetyObject).forEach((key) => {
            try {
                let theSafety = new safetyObject[key]();
                let theSafetyName = theSafety.getName();
                safeties[theSafetyName] = theSafety;
            } catch (error) {
                logger.error(`Safety Manager: Error loading safeties (${error.message})`);
            }
        })
        this.safeties = safeties;
    }

    find(safetyName) {
        return this.safeties[safetyName];
    }

    getList(){
        return this.safeties; // It returns an Object
    }

    async run() {

    }
}