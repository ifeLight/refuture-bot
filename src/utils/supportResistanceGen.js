const getPivots = require('./calculations/getPivots');

module.exports = ({candles, candleDepth = 5, candleSizeDiff = 1, minMatch = 2} ) => {
    if (!candles) return [];
    const {high: topPivots, low: bottomPivots} = getPivots(candles, candleDepth);
    const highPrices = topPivots.map((candle) => candle.high);
    const lowPrices = bottomPivots.map((candle) => candle.low);
    const pivotPoints = [...highPrices, ...lowPrices];
    const totalHeight = candles.reduce((previous, current, index) => {
        return previous + (current.high - current.low);
    }, 0);
    const averageHeight = totalHeight / candles.length;
    const acceptableCandleHeight = averageHeight * candleSizeDiff
    const averageHeightHalf = acceptableCandleHeight / 2;

    // const firstPrice = pivotPoints && pivotPoints[0] ? pivotPoints[0] : 0
    // const line = {
    //     price: firstPrice,
    //     members: [firstPrice],
    //     weight: 1
    // }

    const lines = []

    if (!candles) return;

    for (const price of pivotPoints) {
        let inLineWithPrice = false
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const withinRange = Math.abs(line.price - price) <= averageHeightHalf;
            if (withinRange) {
                inLineWithPrice = true;
                lines[i].members.push(price);
                lines[i].weight += 1;
            }
        }
        if (!inLineWithPrice) {
            lines.push({
                price,
                members: [price],
                weight: 1
            })
        }
    } 

    const filteredLines = lines.filter((line) => line.members.length >= minMatch);
    const reMapForMedian = filteredLines.map((line) => {
        const {members, price, weight} = line;
        const resorted = members.sort((a,b) => a-b);
        const newPrice = resorted[Math.ceil((members.length / 2) - 1)];
        return {price: newPrice, members: resorted, weight};
    })
    const sortedLines = reMapForMedian.sort((a,b) => a.price - b.price);
    return sortedLines;
}