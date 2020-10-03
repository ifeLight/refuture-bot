const express = require('express');        // call express
const app = express();                 // define our app using express
const bodyParser = require('body-parser');
const config = require('config');

const http = require('http');

const api = require('../api/index')

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = config.get('app.port') || 8100;        // set our port

// test route to make sure everything is working (accessed at GET http://localhost:8100/api)
app.get('/', function (req, res) {
    res.json({ message: 'hooray! welcome to our api!' });
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', api);

// START THE SERVER
// =============================================================================
http.createServer(app).listen(port, function (){
    console.log('Trade App Server started  on port ' + port);
})
