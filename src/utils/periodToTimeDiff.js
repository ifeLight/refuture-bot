module.exports = function (period = '5m') {
    if (period.search('m') > -1) {
        const num = Number(period.split('m')[0]);
        return num * 1000 * 60;
    }
    if (period.search('h') > -1) {
        const num = Number(period.split('h')[0]);
        return num * 1000 * 60 * 60;
    }
    if (period.search('d') > -1) {
        const num = Number(period.split('d')[0]);
        return num * 1000 * 60 * 60 * 24;
    }
    if (period.search('M') > -1) {
        const num = Number(period.split('M')[0]);
        return num * 1000 * 60 * 60 * 24 * 30;
    }
    if (period.search('y') > -1) {
        const num = Number(period.split('y')[0]);
        return num * 1000 * 60 * 60 * 24 * 365;
    }

    return 1000 * 60 * 5; //Using 5m as default
}