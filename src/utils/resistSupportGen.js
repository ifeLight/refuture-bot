const getPivots = require('./calculations/getPivots');

module.exports = ({candles, candleDpth = 5, candleSizeDiff = 1} ) => {
    const {high: topPivots, low: bottomPivots} = getPivots(candles, candleDepth);
    const highPrices = topPivots.map((candle) => candle.high);
    const lowPrices = bottomPivots.map((candle) => candle.low);
    const pivotPoints = [...highPrices, ...lowPrices];
    const totalHeight = candles.reduce((previous, current, index) => {
        return previous + (candle.high - candle.low);
    }, 0);
    const averageHeight = totalHeight / candles.length;

    const lines = []

    for (const x of pivotPoints) {
        const line = {
            price: x
        }
        for (const y of pivotPoints) {
            
        }
    } 
}