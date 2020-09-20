const { Telegraf } = require('telegraf')
const config = require('config');

class TelegramNotifier {
    constructor(logger) {
        this.logger = logger;
        const BOT_TOKEN = config.get('notify.telegram_key');
        const CHAT_ID = config.get('notify.telegram_chat_id');
        if (BOT_TOKEN && CHAT_ID) {
            this.telegraf = new Telegraf(BOT_TOKEN);
            this.chatId = CHAT_ID;
        } else {
            this.logger.warn('Telegram not configured')
        }
    }

    send(message) {
        if (!this.telegraf) return;
        let msg;
        if (typeof message === 'string') {
            msg = message;
        } else if (typeof message === 'object') {
            const messageLevel = message.level ? message.level.toUpperCase() + ' \n': '';
            const messageMsg = message.message ? message.message + '\n': '';
            msg = `${messageLevel}${messageMsg}`; 
            delete message.message;
            delete message.level;
            const messageKeys = Object.keys(message);
            for (const key of messageKeys) {
                msg += `${key.toUpperCase()}: ${message[key]} \n`;
            }
        }
        this.telegraf.telegram.sendMessage(this.chatId, msg).catch(err => {
            console.error(`Telegram Notifier: ${JSON.stringify(err)}`);
          });
    }
}

module.exports = TelegramNotifier;