// load the mysql library
var mysql = require('mysql');
var util = require('util');
var moment = require('moment');
var emoji = require('node-emoji');
var React = require('react');
var ReactDOM = require('react-dom');
var render = require('react-dom/server').renderToStaticMarkup;
var express = require('express');
var app = express();
app.use(express.static('css'));


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
            //res.send(postsInHTML(sortedPosts));
            var htmlHomepage = PostsInHTML(sortedPosts);
            var htmlHomepageRendered = render(htmlHomepage);
            res.send(addStyle(htmlHomepageRendered));
        }
    })
})

app.get('/vote', function(req, res) {
    res.redirect('../');
})

app.post('/vote', function(req, res) {
    if (!req.loggedInUser) {
        res.status(401).send('Uh oh, make sure you\'re <a href = "../login">logged in</a> to vote');
    }
    else {
        redditAPI.createOrUpdateVote({
            vote: Number(req.body.vote),
            postId: Number(req.body.postId),
            userId: req.loggedInUser.id
        }, function(err, voted) {
            if (err) {
                res.status(500).send('Uh oh! Something went wrong.. try again later');
            }
            else {
                redditAPI.getSinglePost(voted[0].postId, function(err, post) {
                    if (err) {
                        res.status(500).send('Uh oh! Something went wrong.. try again later');
                    }
                    else {
                        if (Number(req.body.vote) === -1) {
                            var voteValue = "down";
                        }
                        else {
                            voteValue = "up";
                        }
                        var htmlVotepage = VotePage(voteValue, post);
                        var htmlVotepageRendered = render(htmlVotepage);
                        res.send(htmlVotepageRendered);
                    }

                });
            }
        })
    }
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
            var htmlPost = SinglePost(post[0]);
            var htmlPostRender = render(htmlPost);
            if (post[1]) {
                var htmlComments = CommentList(post[1]);
                var htmlCommentsRendered = render(htmlComments);
                res.send(htmlPostRender + htmlCommentsRendered);
            }
            else {
                res.send(htmlPostRender);
            }
        }
    });
});

//------------JSX Functions-----------------

function PostsInHTML(result) {
    return (
        <div className = 'listOfPosts'>
            <h1>List of Posts</h1>
                <ul>
                {result.map(function(post){
                    var postRedirect = `../posts/${post.id}`; 
                    return(
                    <li>
                    <div className = 'info'>
                    <h2><a href = {postRedirect}>{post.title}</a></h2>
                    user: {post.user.username} <br />
                    url: {post.url} <br />
                    created: {moment(post.createdAt).fromNow()} <br />
                    </div>
                    <div className = 'voting'>
                    <form action="/vote" method="post" >
                    <input type="hidden" name="vote" value="1" />
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit">upvote this</button>
                    </form>
                    <form action="/vote" method="post">
                    <input type="hidden" name="vote" value="-1" />
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit">downvote this</button>
                    </form>
                    </div>
                    </li>
                    )
                    })
                }
                </ul>
        </div>
    )
}

function CommentList(comments) {
    return (
        <ul>
            {comments.map(SingleComment)}
        </ul>
    )
}

function SingleComment(comment) {
    return (
        <li>
        <h2>{comment.text}</h2>
        <p>user: {comment.username}<br />
        created: {moment(comment.createdAt).fromNow()}
        </p>
        {comment.replies ? CommentList(comment.replies) : null}
        </li>
    )
}

function SinglePost(post) {
    return (
        <div className = 'post'>
        <h1>{post.title}</h1>
        <p>user: {post.username} <br />
        url: {post.url} <br />
        created: {moment(post.createdAt).fromNow()} <br />
        score: {post.score} 
        </p>
        </div>
    )
}

function VotePage(voteValue, post) {
    return (
        <div className = 'voted'>
            <h1>Yay. You {voteValue}-voted this post.</h1><br />
            <h2>{post[0].title}</h2>
            <p>user: {post[0].username}<br />
                url: {post[0].url}<br />
                score: {post[0].score}<br />
                created: {moment(post[0].createdAt).fromNow()} <br />
            </p>
            <p><a href = '../'> home </a></p>
        </div>
    )
}

//------------Function linking CSS-----------------

function addStyle(someHTML) {
    return `
        <head>
        <title>RedditClone</title>
        <link rel='stylesheet' href='style.css' type = 'text/css' />
        <link href='https://fonts.googleapis.com/css?family=Work+Sans:400,100' rel='stylesheet' type='text/css'>
        </head>
        <body>
        <div class = 'navbar'>
        <div>home</div>
        <div>sort</div>
        <div>create post</div>
        <div>login</div>
        </div>
        <div class = 'title'><h1>RedditClone.</h1></div>
        ${someHTML}
        </body>
    `
}