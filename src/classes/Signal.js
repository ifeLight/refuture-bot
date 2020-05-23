module.exports = class Position {
    constructor (signal, debug) {
        this.signal = signal; // can only be long, short or close
        this.debug = debug;
    }
    get signal () {
        return this.signal;
    }

    get debug () {
        return this.debug;
    }
}