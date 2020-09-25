const {highest, lowest} = require('technicalindicators');

module.exports = (input, period) => {
    const {low, high} = input;
    const highValues = highest({values: high, period});
    const lowValues = lowest({values: low, period});
    let midValues = [];
    for (let i = 0; i < highValues.length; i++) {
        const midValue = (highValues[i] + lowValues[i]) / 2;
        midValues.push(midValue);
    }

    let result =  {
        upper: highValues,
        middle: midValues,
        lower: lowValues
    };
    return result;
}