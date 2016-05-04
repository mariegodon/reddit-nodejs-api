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

var cookieParser = require('cookie-parser');
app.use(cookieParser());

// Boilerplate code to start up the web server
var server = app.listen(process.env.PORT, process.env.IP, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

//middleware to check cookie
app.use(function(req, res, next){
    if (req.cookies.token) {
        console.log(req.cookies.token);
        redditAPI.getUserForCookie(req.cookies.token, function(err, user){
            if(user) {
            req.loggedInUser = user[0];
            }
            next();
        });
    } else {
        next();
    }
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
            res.status(400).send('Try another username!');
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
    redditAPI.checkLogin(req.body.username, req.body.password, function(err, user){
        if (err) {
            res.status(400).send('Username or password is incorrect');
        } else {
            redditAPI.createSession(user.id, function(err, token){
                if (err) {
                    res.status(500).send('Uh oh! Something went wrong.. try again later');
                } else {
                    res.cookie('token', token);
                    res.redirect('../');
                }
            });
        }
    });
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
    if (!req.loggedInUser){
        res.status(401).send('Sign in to create a post!')
    } else{
    redditAPI.createPost({
        //for now default user
        userId: req.loggedInUser.id,
        title: req.body.title,
        url: req.body.url
        //add subreddit later
    }, function(err, newPost){
        if (err) {
            res.status(500).send('Uh oh! Something went wrong.. try again later');
        } else {
            res.redirect(`../posts/${JSON.stringify(newPost.id)}`);
        }
    });
    }
});

app.get('/posts/:postId', function(req, res){
    var postId = Number(req.params.postId);
    redditAPI.getSinglePost(postId, function(err, post){
        if (err){
            res.status(400).send('Post does not exist!');
        } else {
            res.send(post);
        }
    });
});
