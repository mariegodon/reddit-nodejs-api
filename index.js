var mysql = require('mysql');
var util = require('util');
//var moment = require('moment');
//var emoji = require('node-emoji');

var React = require('react');
var ReactDOM = require('react-dom');
var render = require('react-dom/server').renderToStaticMarkup;

var express = require('express');
var app = express();
app.use(express.static('public'));

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
//load all react and styling functions
var toHTML = require('./toHTML.js');

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
app.use(function(req, res, next) {
    
    if (req.cookies.token) {
        redditAPI.getUserForCookie(req.cookies.token, function(err, user) {
            if (user) {
                req.loggedInUser = user[0];
            }
            next();
        });
    }
    else {
        next();
    }
});

app.use(function(req, res, next){
    
    if(req.cookies.message) {
    req.message = req.cookies.message;
    res.clearCookie('message');
    }
    next();
    
})

//get sorted homepage
//will default to new if invalid sorting parameter
//if user just logged in, will say hello
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
            res.status(500).send(toHTML.addStyle(`<p class = 'error'>Uh oh! Something went wrong.. try again later</p>`));
        }
        else {
            var htmlHomepage = toHTML.PostsInHTML(sortedPosts);
            var htmlHomepageRendered = render(htmlHomepage);
            res.send(toHTML.addStyle(htmlHomepageRendered, req.message));
        }
    })
})

//redirect user to homepage, this is where voting happens 
app.get('/vote', function(req, res) {
    res.redirect('/');
})

//after user votes, send vote confirmation
app.post('/vote', function(req, res) {
    if (!req.loggedInUser) {
        res.status(401).send(toHTML.addStyle(`<p class = 'error'>Uh oh, make sure you're <a href = "../login">logged in</a> to vote</p>`));
    }
    else {
        redditAPI.createOrUpdateVote({
            vote: Number(req.body.vote),
            postId: Number(req.body.postId),
            userId: req.loggedInUser.id
        }, function(err, voted) {
            if (err) {
                res.status(500).send(toHTML.addStyle(`<p class = 'error'>Uh oh! Something went wrong.. try again later</p>`));
            }
            else {
                redditAPI.getSinglePost(voted[0].postId, function(err, post) {
                    if (err) {
                        res.status(500).send(toHTML.addStyle(`<p class = 'error'>Uh oh! Something went wrong.. try again later</p>`));
                    }
                    else {
                        if (Number(req.body.vote) === -1) {
                            var voteValue = "down";
                        }
                        else {
                            voteValue = "up";
                        }
                        
                        res.cookie('message', `yay. you ${voteValue}-voted '${post[0].title}'`)                        
                        res.redirect('/');
                    }

                });
            }
        })
    }
})

//signup page
app.get('/signup', function(req, res) {

    var htmlSignUpRender = render(toHTML.SignUp());
    res.send(toHTML.addStyle(htmlSignUpRender));

});

app.post('/signup', function(req, res) {
    redditAPI.createUser({
        username: req.body.username,
        password: req.body.password
    }, function(err, newUser) {
        if (err) {
            res.status(400).send(toHTML.addStyle(`<p class = 'error'>Try another username!</p>`));
        }
        else {
            res.redirect('/login');
        }
    })
})

//login page
app.get('/login', function(req, res) {
    var htmlLoginRender = render(toHTML.LogIn());
    res.send(toHTML.addStyle(htmlLoginRender, req.message));
});

//upon login, check username and password, create session, and redirect to
//homepage with welcome message
//if invalid combo, show error message and redirect to login
app.post('/login', function(req, res) {
    redditAPI.checkLogin(req.body.username, req.body.password, function(err, user) {
        if (err) {
            res.cookie('message', `username or password is incorrect`);
            res.redirect('/login')
        }
        else {
            redditAPI.createSession(user.id, function(err, token) {
                if (err) {
                    res.status(500).send(toHTML.addStyle(`<p class = 'error'>Uh oh! Something went wrong.. try again later</p>`));
                }
                else {
                    res.cookie('token', token);
                    res.cookie('message', `welcome, ${req.loggedInUser.username}`)
                    res.redirect('/');
                }
            });
        }
    });
})

//create post page with form
app.get('/createPost', function(req, res) {

    var htmlPostRender = render(toHTML.CreatePost());
    res.send(toHTML.addStyle(htmlPostRender));

});

//after post creation, store post in database and redirect to post page
app.post('/createPost', function(req, res) {
    if (!req.loggedInUser) {
        res.status(401).send(toHTML.addStyle(`<p class = 'error'>Sign in to create a post!</p>`))
    }
    else {
        redditAPI.createPost({
            //for now default user
            userId: req.loggedInUser.id,
            title: req.body.title,
            url: req.body.url
                //add subreddit later
        }, function(err, newPost) {
            if (err) {
                res.status(500).send(toHTML.addStyle(`<p class = 'error'>Uh oh! Something went wrong.. try again later</p>`));
            }
            else {
                res.redirect(`/posts/${JSON.stringify(newPost.id)}`);
            }
        });
    }
});

//page for single posts with comments
app.get('/posts/:postId', function(req, res) {
    var postId = Number(req.params.postId);
    redditAPI.getSinglePost(postId, function(err, post) {
        if (err) {
            res.status(400).send(toHTML.addStyle(`<p class = 'error'>Post does not exist!</p>`));
        }
        else {
            var htmlPost = toHTML.SinglePost(post[0]);
            var htmlPostRender = render(htmlPost);
            if (post[1]) {
                var htmlComments = toHTML.CommentList(post[1]);
                var htmlCommentsRendered = render(htmlComments);
                res.send(toHTML.addStyle(htmlPostRender + htmlCommentsRendered));
            }
            else {
                res.send(toHTML.addStyle(htmlPostRender));
            }
        }
    });
});

// app.get('/logout', function(req, res){
    
// })