module.exports = class Logger {
    constructor() {}
    static errorLogger (error) {
        console.error(error);
    }
}