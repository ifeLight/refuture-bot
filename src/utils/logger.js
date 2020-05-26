const winston = require('winston');
const path = require('path')

const logger = winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: path.join(__dirname, 'file.log') })
    ]
  });

module.exports = logger;