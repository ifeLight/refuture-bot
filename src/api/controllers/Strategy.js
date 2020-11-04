const requireAll = require('require-all');
const path = require('path');
const humanizeString = require('humanize-string');

const fetchStrategies = function (type='indicators') {
    let strategies = [];
    const requiredStrategies = requireAll({
        dirname: path.resolve(__dirname, `../../strategies/${type}`),
        recursive: false
    });

    Object.keys(requiredStrategies).forEach((file) => {
        const instance = new requiredStrategies[file]();
        let options = [];
        const name = instance.getName();
        const defaultOptions = instance.getOptions();
        const title = humanizeString(name)
        Object.keys(defaultOptions).forEach((key) => {
            let option = {};
            let value = defaultOptions[key]
            option.title = humanizeString(key);
            option.defaultValue = value;
            option.name = key;
            option.type = typeof value;
            options.push(option)
        })
        strategies.push({
            title, name, options
        });
    });
    return strategies;
}
const getIndicators = function () {
    return fetchStrategies('indicators');
}

const getSafeties = function () {
    return fetchStrategies('safeties');
}

const getInsurances = function () {
    return fetchStrategies('insurances');
}

const error500 = function (res) {
    return res.status(500).json({
        error: true,
        message: "An error occured"
    })
}
class StrategyCtrl {
    static async getIndicators(req, res) {
        try {
            const indicators = getIndicators()
            return res.status(200).json(indicators);
        } catch (error) {
            console.error(error);
            return error500(res);
        }
    }

    static async getInsurances(req, res) {
        try {
            const result = getInsurances()
            return res.status(200).json(result);
        } catch (error) {
            console.error(error);
            return error500(res);
        }
    }

    static async getSafeties(req, res) {
        try {
            const resuls = getSafeties()
            return res.status(200).json(resuls);
        } catch (error) {
            console.error(error);
            return error500(res);
        }
    }

}

module.exports =  StrategyCtrl;