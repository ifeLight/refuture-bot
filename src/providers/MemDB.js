const { AsyncNedb } = require('nedb-async');
const db = new AsyncNedb();
module.exports = db;