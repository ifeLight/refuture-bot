const config = require('config');
const mongoose = require('mongoose')
const logger = require('../utils/logger');

const connectionUri = config.get('db.uri');

const dbUser = config.get('db.username');
const dbPassword = config.get('db.password');

const authCollectionName = {}

if (dbUser && dbPassword) {
    authCollectionName.authSource = 'admin'
}

/**
 * Mongoose Connection URI
 */
mongoose.connect(connectionUri, { 
    autoIndex: false, 
    useNewUrlParser: true ,
    useFindAndModify: false,
    useUnifiedTopology: true,
    ...authCollectionName
});

/**
 * To set Debug
 */
//mongoose.set('debug', true)


/**
 * Mongoose Connection Events
 */
mongoose.connection.on("connected", function () {
    logger.info(`Mongo Database: Database Connected`);
})

mongoose.connection.on("disconnected", function () {
    logger.error(`Mongo Database: Database Disconnected, Exiting...`);
    process.exit(0);
})

mongoose.connection.on("error", function (error) {
    logger.error(`Mongo Database: An Error occured (${error.message})`);
    process.exit();
})

/**
 * Close Mongoose Conection When app shuts down
 */
process.on("SIGINT", function () {
    logger.error(`Mongo Database: Closing Mongo Database....`);
    mongoose.connection.close(function (err) {
        if (err) {
            logger.info(`Mongo Database: Connection now closed (${error.message})`);
            process.exit(0);
        }
    })
})


module.exports  = mongoose;