const calcLine = require('./calculations/calcLine');
const getPivots = require('./calculations/getPivots');
const getPriceFromLine = require('./calculations/getPriceFromLine');

module.exports = ({candles, candleDepth= 5, maxLines = 5, lineAllowancePercentage = 0.1, priceLineDiffPercentage = 2}) => {
    const {high: topPivots, low: bottomPivots} = getPivots(candles, candleDepth);

    // console.log(bottomPivots.length)

    // The Upper and Lower Lines
    // The will contain arrays of an object : {slope, intercept}
    const upperLines = [];
    const lowerLines = [];

    // The line to price cross pecentage allowance
    const lineAllowance = lineAllowancePercentage / 100;

    // Allowed Price from Line Difference
    const lastCandle = candles[candles.length - 1];
    const priceLineDiff = (priceLineDiffPercentage / 100) * lastCandle.close;
    // console.info(Number(lastCandle.high));

    // Calculating the Lines of the upper pivots
    for (let i = 0; i < topPivots.length; i++) {
        for (let j = i + 1; j < (topPivots.length); j++) {
            if (j == topPivots.length) break;
            const x1 = Number(topPivots[i].time);
            const x2 = Number(topPivots[j].time);
            const y1 = Number(topPivots[i].high);
            const y2 = Number(topPivots[j].high);
            const calculatedLine = calcLine(x1, y1, x2, y2);
            calculatedLine.x1Time = x1; // new Date(x1).toString();
            calculatedLine.x2Time = x2; // new Date(x2).toString();
            calculatedLine.y1Price = y1;
            calculatedLine.y2Price = y2;
            const priceAtEndFromLine = getPriceFromLine(calculatedLine, Number(lastCandle.time))
            calculatedLine.priceEnd = priceAtEndFromLine;
            const priceFromLineDiff = priceAtEndFromLine - Number(lastCandle.high)
            let pushLine = true;
            if ( priceFromLineDiff > priceLineDiff ) {
                pushLine = false;
            }  else {
                const behindTime = x1 < x2 ? x1 : x2;
                for (let k = candles.length - 1; k > 2; k--) {
                    const candleTime = Number(candles[k].time);
                    const candleHighPrice = Number(candles[k].high);
                    if (candleTime > behindTime) {
                        const candlePriceFromLine = getPriceFromLine(calculatedLine, candleTime)
                        if (candleHighPrice > (candlePriceFromLine + (candlePriceFromLine * lineAllowance))) {
                            pushLine = false;
                            break;
                        }
                    } else {
                        break;
                    }
                    
                }
            }
            if (pushLine) {
                upperLines.push(calculatedLine)
            }
        }
    }

    // Calculating the Lines of the lower pivots
    for (let i = 0; i < bottomPivots.length; i++) {
        for (let j = i + 1; j < (bottomPivots.length ); j++) {
            if (j == bottomPivots.length) break;
            const x1 = Number(bottomPivots[i].time);
            const x2 = Number(bottomPivots[j].time);
            const y1 = Number(bottomPivots[i].low);
            const y2 = Number(bottomPivots[j].low);
            const calculatedLine = calcLine(x1, y1, x2, y2);
            calculatedLine.x1Time = x1; // new Date(x1).toString();;
            calculatedLine.x2Time = x2; //new Date(x2).toString();;
            calculatedLine.y1Price = y1;
            calculatedLine.y2Price = y2;
            const priceAtEndFromLine = getPriceFromLine(calculatedLine, Number(lastCandle.time))
            const priceFromLineDiff = Number(lastCandle.low) - priceAtEndFromLine;
            calculatedLine.priceEnd = priceAtEndFromLine;
            let pushLine = true;
            if ( priceFromLineDiff > priceLineDiff ) {
                pushLine = false;
            } else {
                const behindTime = x1 < x2 ? x1 : x2;
                for (let k = candles.length - 1; k > 2; k--) {
                    const candleTime = Number(candles[k].time);
                    const candleLowPrice = Number(candles[k].low);
                    if (candleTime > behindTime) { 
                        const candlePriceFromLine = getPriceFromLine(calculatedLine, candleTime)
                        if (candleLowPrice < (candlePriceFromLine - (candlePriceFromLine * lineAllowance))) {
                            pushLine = false;
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            if (pushLine) {
                lowerLines.push(calculatedLine)
            }
        }
    }

    // console.log(upperLines);
    // console.log(lowerLines);

    // Filter Lines that are alike
    const filteredUpperLines = [];
    const filteredLowerLines = [];

    // Filtering Loop For UpperLines
    for (let i = 0; i < upperLines.length; i++) {
        let pushAsFiltered = true;
        if (filteredUpperLines.length > 0) {
            for (let j = 0; j < filteredUpperLines.length; j++) {
                const slopeQuotient = upperLines[i].slope / filteredUpperLines[j].slope;
                const diffAllowed = filteredUpperLines[j].priceEnd * (lineAllowance / 2);
                const cond1 = Math.abs(upperLines[i].priceEnd - filteredUpperLines[j].priceEnd) < diffAllowed;
                const cond2 = slopeQuotient > 0.9 && slopeQuotient < 1.2;
                if (cond1 & cond2) {
                    if (filteredUpperLines[j].x2Time > upperLines[i].x2Time) {
                        filteredUpperLines[j].x2Time = upperLines[i].x2Time;
                        filteredUpperLines[j].y2Price = upperLines[i].y2Price;
                    }
                    filteredUpperLines[j].weight = filteredUpperLines[j].weight ? filteredUpperLines[j].weight + 1 : 1;
                    pushAsFiltered = false;
                    break;
                }
            }
        }
        if (pushAsFiltered) {
            upperLines[i].weight = 1;
            filteredUpperLines.push(upperLines[i]);
        }
    }

    // Filtering Loop For LowerLines
    for (let i = 0; i < lowerLines.length; i++) {
        let pushAsFiltered = true;
        if (filteredLowerLines.length > 0) {
            for (let j = 0; j < filteredLowerLines.length; j++) {
                const slopeQuotient = lowerLines[i].slope / filteredLowerLines[j].slope;
                const diffAllowed = filteredLowerLines[j].priceEnd * (lineAllowance / 2);
                const cond1 = Math.abs(lowerLines[i].priceEnd - filteredLowerLines[j].priceEnd) < diffAllowed;
                const cond2 = slopeQuotient > 0.9 && slopeQuotient < 1.2;
                if (cond1 && cond2) {
                    if (filteredLowerLines[j].x2Time > lowerLines[i].x2Time) {
                        filteredLowerLines[j].x2Time = lowerLines[i].x2Time;
                        filteredLowerLines[j].y2Price = lowerLines[i].y2Price;
                    }
                    
                    filteredLowerLines[j].weight = filteredLowerLines[j].weight ? filteredLowerLines[j].weight + 1 : 1;
                    pushAsFiltered = false;
                    break;
                }
            }
        }
        if (pushAsFiltered === true) {
            lowerLines[i].weight = 1;
            filteredLowerLines.push(lowerLines[i]);
        }
    }


    //  SORT FUNCTIONS
    const weightCompareFunc = (line1, line2) => {
        return line2.weight - line1.weight;
    }

    const steepCompareForUpperFunc = (line1, line2) => {
        return line2.intercept - line1.intercept;
    }

    const steepCompareForLowerFunc = (line1, line2) => {
        return line1.intercept - line2.intercept;
    }

    const proximityCompareForUpperFunc = (line1, line2) => {
        const price = Number(lastCandle.high);
        return Math.abs((Number(line1.priceEnd) - price)) - Math.abs((Number(line2.priceEnd) - price))
    }

    const proximityCompareForLowerFunc = (line1, line2) => {
        const price = Number(lastCandle.low);
        return Math.abs((Number(line1.priceEnd) - price)) - Math.abs((Number(line2.priceEnd) - price))
    }


    // Sorting lower lines
    filteredLowerLines.sort(proximityCompareForLowerFunc);
    // filteredLowerLines.sort(weightCompareFunc);
    // filteredLowerLines.sort(steepCompareForLowerFunc);

    // Sorting Upper lines
    filteredUpperLines.sort(proximityCompareForUpperFunc);
    // filteredUpperLines.sort(weightCompareFunc);
    // filteredUpperLines.sort(steepCompareForUpperFunc);

    return {
        upperLines: filteredUpperLines.slice(0, maxLines),
        lowerLines: filteredLowerLines.slice(0, maxLines)
    }
}