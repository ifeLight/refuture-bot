const { Telegraf } = require('telegraf')
const config = require('config');

const BOT_TOKEN = config.get('notify.telegram_key');

const telegram = new Telegraf(BOT_TOKEN);

module.exports = telegram;