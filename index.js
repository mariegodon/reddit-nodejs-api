// load the mysql library
var mysql = require('mysql');
var util = require('util');
var moment = require('moment');

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
        }
        else {
            res.send(postsInHTML(sortedPosts));
        }
    })
})

app.post('/vote', function(req, res) {
    redditAPI.createOrUpdateVote({
        vote: Number(req.body.vote),
        postId: Number(req.body.postId),
        userId: req.loggedInUser.id
    }, function(err, voted) {
        if (err) {
            res.status(401).send('Uh oh, make sure you\'re logged in to vote');
        }
        else {
            redditAPI.getSinglePost(voted[0].postId, function(err, post) {
                if (err) {
                    res.status(500).send('Uh oh! Something went wrong.. try again later')
                }
                else {
                    if (Number(req.body.vote) === -1) {
                        var voteValue = "down";
                    }
                    else {
                        voteValue = "up";
                    }
                    //format comments part!!
                    // if (post[1]) {
                    //     var comments = "comments:" + JSON.stringify(post[1]);
                    // }
                    // else {
                    //     comments = '';
                    // }
                    res.send(`<h1>Yay. You ${voteValue}-voted this post.</h1><br>
                    <h2>${post[0].title}</h2>
                    <p>author: ${post[0].userId}<br>
                        url: ${post[0].url}</br>
                        score: ${post[0].score}<br>
                        created: ${moment(post[0].createdAt).fromNow()} </br>
                    </p>`);
                }

            });
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

app.post('/signup', function(req, res) {
    redditAPI.createUser({
        username: req.body.username,
        password: req.body.password
    }, function(err, newUser) {
        if (err) {
            res.status(400).send('Try another username!');
        }
        else {
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

app.post('/login', function(req, res) {
    redditAPI.checkLogin(req.body.username, req.body.password, function(err, user) {
        if (err) {
            res.status(400).send('Username or password is incorrect');
        }
        else {
            redditAPI.createSession(user.id, function(err, token) {
                if (err) {
                    res.status(500).send('Uh oh! Something went wrong.. try again later');
                }
                else {
                    res.cookie('token', token);
                    res.redirect('../');
                }
            });
        }
    });
})

//create post page
app.get('/createPost', function(req, res) {
    res.sendFile('./createPost.html', {
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

app.post('/createPost', function(req, res) {
    if (!req.loggedInUser) {
        res.status(401).send('Sign in to create a post!')
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
                res.status(500).send('Uh oh! Something went wrong.. try again later');
            }
            else {
                res.redirect(`../posts/${JSON.stringify(newPost.id)}`);
            }
        });
    }
});

app.get('/posts/:postId', function(req, res) {
    var postId = Number(req.params.postId);
    redditAPI.getSinglePost(postId, function(err, post) {
        if (err) {
            res.status(400).send('Post does not exist!');
        }
        else {
            res.send(post);
        }
    });
});

function postsInHTML(result) {
    var htmlPosts = `<div> <h1>List of Posts</h1> <ul>`;
    result.forEach(function(post) {
        var thisPostHtml =
            `<li>
            <h4>${post.title}</h4>
                <p>user: ${post.user.username} <br>
                    url: ${post.url} <br>
                    id: ${post.id} <br>
                    created: ${moment(post.createdAt).fromNow()} <br>
                </p>
                <form action="/vote" method="post">
                <input type="hidden" name="vote" value="1">
                <input type="hidden" name="postId" value=${post.id}>
                <button type="submit">upvote this</button>
                </form>
                <form action="/vote" method="post">
                <input type="hidden" name="vote" value="-1">
                <input type="hidden" name="postId" value=${post.id}>
                <button type="submit">downvote this</button>
                </form>
        </li>`;
        htmlPosts += thisPostHtml;
    });
    return (`${htmlPosts}</ul></h1></div>`);
}

// function commentsInHtml(commentObj){
//     var commentHtml = `<h3>Comments</h3><ul>`
//     commentObj.forEach(comment){
//         var thisCommentHtml = `
//         <li>
//         <h2>${comment.text}<h2><br>
        
//     }
// }
// //create new comments in final array
// function newComment(currObj, level) {
//     var newCommentObj = {};
//     newCommentObj.id = currObj[`${level}Id`];
//     newCommentObj.text = currObj[`${level}Text`];
//     newCommentObj.createdAt = currObj[`${level}CreatedAt`];
//     newCommentObj.updatedAt = currObj[`${level}UpdatedAt`];
//     newCommentObj.username = currObj[`${level}UserName`];
//     //if this is a parent level comment, check if it has a c1 and add it
//     if (level === "parent") {
//         if (currObj.c1Id) {
//             newCommentObj.replies = [];
//             newCommentObj.replies.push(newComment(currObj, "c1"));
//         }
//     }
//     //if this is a c1 level comment, check if it has a c2 and add it
//     if (level === "c1") {
//         if (currObj.c2Id) {
//             newCommentObj.replies = [];
//             newCommentObj.replies.push(newComment(currObj, "c2"));
//         }
//     }
//     return newCommentObj;
// }