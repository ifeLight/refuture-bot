const { MongoStorage } = require('mongodb-keyval-storage')
const config  = require('config');

let theStorage = new MongoStorage({
    db: config.get('db.uri'),
    collectionName: config.get('db.optionsCollection')
})

module.exports = theStorage;
