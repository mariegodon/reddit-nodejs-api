// load the mysql library
var mysql = require('mysql');
var util = require('util');

// create a connection to our Cloud9 server
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'mariegodon',
    password: '',
    database: 'reddit'
});

// load our API and pass it the connection
var reddit = require('./reddit');
var redditAPI = reddit(connection);

var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Boilerplate code to start up the web server
var server = app.listen(process.env.PORT, process.env.IP, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

//get sorted homepage
//will default to new if invalid sorting parameter
app.get('/', function(req, res) {
    if (req.query.sort) {
    var sort = req.query.sort;        
    }
    else {
    sort = null;  
    }
    redditAPI.getAllPosts({
        sortingMethod: sort
    }, function(err, sortedPosts) {
        if (err) {
            res.status(500).send('Uh oh! Something went wrong.. try again later');
        } else {
            res.send(sortedPosts);
        }
    })
})

//signup page
app.get('/signup', function(req, res) {
    res.sendFile('./signup.html', {
        root: __dirname
    }, function(err, result) {
        if (err) {
            res.status(500).send('Error!');
        }
        else {
            return;
        }
    });
});

app.post('/signup', function(req, res){
    redditAPI.createUser({
        username: req.body.username,
        password: req.body.password
    }, function(err, newUser){
        if (err) {
            res.status(400).send('Try another username and password!');
        } else {
            res.redirect('../login');
        }
    })
})

//login page
app.get('/login', function(req, res) {
    res.sendFile('./login.html', {
        root: __dirname
    }, function(err, result) {
        if (err) {
            res.status(500).send('Error!');
        }
        else {
            return;
        }
    });
});

app.post('/login', function(req, res){
    
})

//create post page
app.get('/createPost', function (req,res){
    res.sendFile('./createPost.html', {
        root: __dirname
    }, function(err, result) {
        if (err) {
            res.status(500).send('Error!');
        } else {
            return;
        }
    });
});

app.post('/createPost', function(req, res){
    
})

