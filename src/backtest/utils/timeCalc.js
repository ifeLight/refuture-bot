module.exports = function (time) {
    return ((Date.now() - parseInt(time)) / 1000).toFixed(2);
}