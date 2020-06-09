const path = require('path');
const requireAll = require('require-all');

class InsuranceManager {
    constructor() {
        const insuranceDir = path.join(__dirname, '../../', 'strategies','insurances');
        const insuranceObject = requireAll(insuranceDir);
        const insurances = {};
        Object.keys(insuranceObject).forEach((key) => {
            try {
                let theInsurance = new insuranceObject[key]();
                let theInsuranceName = theInsurance.getName();
                insurances[theInsuranceName] = theInsurance;
            } catch (error) {
                logger.error(`Insurance Manager: Error loading Insurances (${error.message})`);
            }
        })
        this.insurances = insurances;
    }

    find(insuranceName) {
        return this.insurances[insuranceName];
    }

    getList(){
        return this.insurances; // It returns an Object
    }

    async run() {

    }
}