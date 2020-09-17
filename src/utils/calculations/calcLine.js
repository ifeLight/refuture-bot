module.exports = (x1, y1, x2, y2) => {
    slope = (y2 - y1) /( x2 -x1);
    intercept = y2 - (slope * x2);
    return {
        slope,
        intercept
    }
}