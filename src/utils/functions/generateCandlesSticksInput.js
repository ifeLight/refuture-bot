const generateCandlesSticksInputs = function (candles, length) {
    const retouchedCandles = {open: [], close: [], high: [], volume: [], low: []};
    const startingPoint = length && (length < candles.length) ? candles.length - length: 0;
    for (let x = startingPoint; x < candles.length; x++) {
        const { open, high, close, low, volume } = candles[x];
        retouchedCandles.open.push(open);
        retouchedCandles.close.push(close);
        retouchedCandles.high.push(high);
        retouchedCandles.low.push(low);
        retouchedCandles.volume.push(volume);
    }
    return retouchedCandles;
}

module.exports = generateCandlesSticksInputs;