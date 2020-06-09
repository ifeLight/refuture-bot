const path = require('path');
const requireAll = require('require-all');

class PolicyManager {
    constructor() {
        const policyDir = path.join(__dirname, '../../', 'strategies','policies');
        const policyObject = requireAll(policyDir);
        const policies = {};
        Object.keys(policyObject).forEach((key) => {
            try {
                let thePolicy = new policyObject[key]();
                let thePolicyName = thePolicy.getName();
                policies[thePolicyName] = thePolicy;
            } catch (error) {
                logger.error(`Policy Manager: Error loading policies (${error.message})`);
            }
        })
        this.policies = policies;
    }

    find(policyName) {
        return this.policies[policyName];
    }

    getList(){
        return this.policies; // It returns an Object
    }

    async run() {

    }
}