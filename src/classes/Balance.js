module.exports = class Balance {
    constructor(asset, free, locked) {
        this.asset = asset;
        this.free = Number(free);
        this.locked = Number(locked);
    }

    get total () {
        return this.free + this.locked;
    }
}