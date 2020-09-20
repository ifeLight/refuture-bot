const TelegramNotifier = require('./Telegram')

class Notifier {
    constructor(logger) {
        this.notifyChannels = [];
        this.logger = logger;
        this.notifyChannels.push(new TelegramNotifier(logger))
    }

    send(message) {
        for (const notifier of this.notifyChannels) {
            try {
                notifier.send(message);
            } catch (error) {
                this.logger.warn(`Notifier: ${error.message} `);
            }
        }
    }
}

module.exports = Notifier;