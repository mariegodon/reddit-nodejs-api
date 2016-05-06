var React = require('react');
var ReactDOM = require('react-dom');
var render = require('react-dom/server').renderToStaticMarkup;
var moment = require('moment');

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
                    <div className = 'title'>
                    <h2><a href = {postRedirect}>{post.title}</a></h2>
                    </div>
                    <div className = 'info'>
                    user: {post.user.username} <br />
                    url: {post.url} <br />
                    created: {moment(post.createdAt).fromNow()} <br />
                    </div>
                    <div className = 'placeKitten'>
                    <img src="http://placekitten.com/125/125" />
                    </div>
                    <div className = 'voting'>
                    <div className = 'upVote'>
                    <form action="/vote" method="post" >
                    <input type="hidden" name="vote" value="1" />
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit"><span>upvote this</span></button>
                    </form>
                    <div id = 'voteScore'>{post.voteScore}</div>
                    </div>
                    <div className = 'downVote'>
                    <form action="/vote" method="post">
                    <input type="hidden" name="vote" value="-1" />
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit"><span>downvote this</span></button>
                    </form>
                    </div>
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
        <ul className = 'comments'>
            {comments.map(SingleComment)}
        </ul>
    )
}

function SingleComment(comment) {
    return (
        <li>
        <div className = 'singleComment'>
        <h2>{comment.text}</h2>
        <p>user: {comment.username}<br />
        created: {moment(comment.createdAt).fromNow()}
        </p>
        </div>
        {comment.replies ? CommentList(comment.replies) : null}
        </li>
    )
}

function SinglePost(post) {
    return (
        <div className = 'post'>
            <h1>{post.title}</h1>
            <div>
                <p>user: {post.username} <br />
                    url: {post.url} <br />
                    created: {moment(post.createdAt).fromNow()} <br />
                </p>
            </div>
            <div className = 'placeKitten' >
                <img src="http://placekitten.com/125/125" />
            </div>
            <div className = 'voting'>
                <div className = 'upVote'>
                    <form action="/vote" method="post" >
                    <input type="hidden" name="vote" value="1" />
                    <input type="hidden" name="postId" value={post.postID} />
                    <button type="submit"><span>upvote this</span></button>
                    </form>
                    <div id = 'voteScore'>{post.score}</div>
                </div>
                <div className = 'downVote'>
                    <form action="/vote" method="post">
                    <input type="hidden" name="vote" value="-1" />
                    <input type="hidden" name="postId" value={post.postID} />
                    <button type="submit"><span>downvote this</span></button>
                    </form>
                </div>
            </div>
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

function SignUp() {
    return (
        <div className = 'form'>
        <form action="/signup" method="POST">
            <p>Create a username and password</p>
            <div>
                <input id='input1' type="text" name="username" placeholder="username" />
            </div>
            <div>
                <input id='input2' type="password" name="password" placeholder="password" />
            </div>
            <div>
            <button id='submit' type="submit">Create account!</button>
            </div>
        </form>
        </div>
    )
}

function LogIn(){
    return (
        <div className = 'form'>
            <form action="/login" method="POST">
                <p>Enter your username and password</p>
                <div>
                    <input id = 'input1' type="text" name="username" placeholder="username" />
                </div>
                <div>
                    <input id = 'input2' type="password" name="password" placeholder="password" />
                </div>
                <div>
                <button id = 'submit' type="submit">Sign in!</button>
                </div>
            </form>
        </div>
    )
}

function CreatePost(){
    return (
        <div className = 'form'>
            <form action="/createPost" method="POST">
            <p>Create a post</p>
            <div>
                <input id='input1' type="text" name="title" placeholder="title"/>
            </div>
            <div>
                <input id='input2' type="text" name="url" placeholder="url"/>
            </div>
            <div>
            <button id='submit' type="submit">Post!</button>
            </div>
        </form>
    </div>
    )
}

//------------Function linking CSS-----------------

function addStyle(someHTML, req, welcomeUser) {

    if (!welcomeUser) {
        var welcomeUser = '';
    }
    
    var rightNav = 
        `<div class='menuItem'><a href = '/createPost'>create post</a></div>
         <div class = 'menuItem'><a href = '/logout'>logout</a></div>`
    
    if (!req.loggedInUser) {
        rightNav = `
            <div class = 'login' class='menuItem'><span class = 'dropbtn'>login</span>
                <div class="dropdown-content">
                    <a href="/login">login</a>
                    <a href="/signup">signup</a>
                </div>
            </div>`
    }
    
    return `
        <head>
        <title>RedditClone</title>
        <link rel='stylesheet' href='/css/style.css' type = 'text/css' />
        <link href='https://fonts.googleapis.com/css?family=Work+Sans:400,100' rel='stylesheet' type='text/css'>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.2/jquery.min.js"></script>
        <script type = 'text/javascript' src = '/script/script.js'></script>
        </head>
        <body>
        <div class = 'header'>

            <div class = 'navbar'>
                <div class = 'login' class='menuItem'><span class = 'dropbtn'>sort</span>
                    <div class="dropdown-content">
                    <a href="/?sort=hot">hot</a>
                    <a href="/?sort=top">top</a>                    
                    <a href="/?sort=controversial">controversial</a>
                    </div>                
                </div>
                <div class = 'menuItem' id = 'middleNav'>${welcomeUser}</div>
                <div class = 'rightNav'>
                    ${rightNav}
                </div>
            </div>
            <div class = 'pageTitle'><a href = '/'><h1>RedditClone.</h1></a></div>
        </div>
        <div class = 'varContent'>
        ${someHTML}
        </div>
        <div id = 'animation'>
        <img src='/reddit-ant.png'/ id = 'antenna'>
        <img src='/Reddit-Icon.png'/>
        </div>
        </body>
    `
}

module.exports = {
    PostsInHTML: PostsInHTML,
    CommentList: CommentList,
    SingleComment: SingleComment,
    SinglePost: SinglePost,
    VotePage: VotePage,
    SignUp: SignUp,
    LogIn: LogIn,
    CreatePost: CreatePost,
    addStyle: addStyle
}