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

//It's request time!
// redditAPI.createUser({
//   username: 'hello24',
//   password: 'xxx'
// }, function(err, user) {
//   if (err) {
//     console.log(err);
//   }
//   else {
//     redditAPI.createPost({
//       title: 'hi reddit!',
//       url: 'https://www.reddit.com',
//       userId: user.id
//     }, function(err, post) {
//       if (err) {
//         console.log(err);
//       }
//       else {
//         console.log(post);
//       }
//     });
//   }
// });

// redditAPI.createPost({
//       title: 'some post!',
//       url: 'https://www.reddit.com',
//       userId: 3,
//     }, function(err, post) {
//       if (err) {
//         console.log(err);
//       }
//       else {
//         console.log(post);
//       }
//     });

// redditAPI.getAllPosts(
// {sortingMethod: "hot"},
//   function(err, result){
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(result);
//   }
// });

// redditAPI.getAllPostsForUser(1, function(err, result){
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(result);
//   }
// });

redditAPI.getSinglePost(2, function(err, result){
  if (err) {
    console.log(err);
  } else {
    console.log(util.inspect(result, { showHidden: true, depth: 10, colors: true }));
  }
});

// redditAPI.getAllSubreddits(function(err, sub) {
//   if (err) {
//     console.log(err);
//   }
//   else {
//     console.log(sub);
//   }
// });

// redditAPI.createPost({
//   title: 'hot hot hot',
//   url: 'https://www.reddit.com',
//   userId: 1,
//   subredditId: 1
// }, function(err, post) {
//   if (err) {
//     console.log(err);
//   }
//   else {
//     console.log(post);
//   }
// });

// redditAPI.createComment({
//   text: "i love starbucks",
//   postId: 5,
//   userId: 1,
//   parentId: 9
// }, function(err, post) {
//   if (err) {
//     console.log(err);
//   }
//   else {
//     console.log(post);
//   }
// });

// redditAPI.getCommentsForPost(5, function(err, sub) {
//   if (err) {
//     console.log(err);
//   }
//   else {
//     console.log(util.inspect(sub, { showHidden: true, depth: 10, colors: true }));
//   }
// });

// redditAPI.createOrUpdateVote(
//   {vote: 1,
//   userId: 8,
//   postId: 4},
//   function(err, result){
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(result);
//     }
//   });

