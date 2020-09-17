module.exports = function (candles, depth= 5) {
    const highCandles = [];
    const lowCandles = [];

    for (let index = 0; index < candles.length - (depth + 1); index++) {
        if (index <= depth) continue;
        const candle = candles[index];

        //Asuming they are highcandle and low candle
        let highCandleBoolean = true;
        let lowCandleBoolean = true;

        // For High && Low candle detection
        // left Check
        for (let i = 1; i <= depth; i++) {
            const toCheckLeftCandle = candles[index + i];
            const toCheckRightCandle = candles[index - i];
            
            //Checking if it is still a high Candle
            if (Number(candle.high) < Number(toCheckLeftCandle.high) || Number(candle.high) < Number(toCheckRightCandle.high)) {
                highCandleBoolean = false;
            }
            //Checking wether if its still a low candle
            if (Number(candle.low) > Number(toCheckLeftCandle.low) || Number(candle.low) > Number(toCheckRightCandle.low)) {
                lowCandleBoolean = false;
            }
            if (!highCandleBoolean && !lowCandleBoolean) break;
        }
        if (highCandleBoolean) {
            highCandles.push(candle);
        }
        if (lowCandleBoolean) {
            lowCandles.push(candle);
        }
    }
    return {
        high: highCandles,
        low: lowCandles
    }
}