const {atr, highest, lowest} = require('technicalindicators');

module.exports = (input, period=14, atrPeriod=22, coef = 3, side ='long' ) => {
    const {low, close, high, open} = input;
    const atrResult = atr({...input, period: atrPeriod });
    let peakValues;
    const isLong = side === 'long' ? true : false
    if (isLong) {
        peakValues = highest({values: high, period});
    } else {
        peakValues = lowest({values: low, period});
    }

    let result = [];
    let loopLength = peakValues.length <= atrResult.length ? peakValues.length : atrResult.length; 

    for (let i = 0; i < loopLength; i++) {
        const atrValue = atrResult[atrResult.length - (1 + i)];
        const peakValue = peakValues[peakValues.length - (1 + i)];
        if (isLong) {
            result.unshift(peakValue - (atrValue * coef))
        } else {
            result.unshift(peakValue + (atrValue * coef))
        }
    }
    return result;
}