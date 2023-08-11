class IntervalEvent {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.keys = {};
    }

    add (key, interval = 1) {
        this.clear(key)
        this.createEvent(key, interval)
    }

    createEvent(key, interval = 1) {
        const self = this;
        this.keys[key] = setInterval(() => {
            const date = new Date();
            const millis = date.getMilliseconds();
            const seconds = date.getSeconds();
            const minutes = date.getMinutes();
            const check1 = millis > 0 && millis <= 500;
            const check2 = seconds === 0;
            const check3 = minutes % interval  === 0;
            if (check1 && check2 && check3) {
                self.eventEmitter.emit(key);
            }
        }, 500);
    }

    clear (key) {
        if (this.keys[key]) {
            clearInterval(this.keys[key])
            this.keys[key] = undefined;
        }
    }
}

module.exports = IntervalEvent;