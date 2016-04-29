var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;

module.exports = function RedditAPI(conn) {
    return {
        createUser: function(user, callback) {

            // first we have to hash the password...
            bcrypt.hash(user.password, HASH_ROUNDS, function(err, hashedPassword) {
                if (err) {
                    callback(err);
                }
                else {
                    conn.query(
                        'INSERT INTO `users` (`username`,`password`, `createdAt`) VALUES (?, ?, ?)', [user.username, hashedPassword, null],
                        function(err, result) {
                            if (err) {
                                /*
                                There can be many reasons why a MySQL query could fail. While many of
                                them are unknown, there's a particular error about unique usernames
                                which we can be more explicit about!
                                */
                                if (err.code === 'ER_DUP_ENTRY') {
                                    callback(new Error('A user with this username already exists'));
                                }
                                else {
                                    callback(err);
                                }
                            }
                            else {
                                /*
                                Here we are INSERTing data, so the only useful thing we get back
                                is the ID of the newly inserted row. Let's use it to find the user
                                and return it
                                */
                                conn.query(
                                    'SELECT `id`, `username`, `createdAt`, `updatedAt` FROM `users` WHERE `id` = ?', [result.insertId],
                                    function(err, result) {
                                        if (err) {
                                            callback(err);
                                        }
                                        else {
                                            /*
                                            Finally! Here's what we did so far:
                                            1. Hash the user's password
                                            2. Insert the user in the DB
                                            3a. If the insert fails, report the error to the caller
                                            3b. If the insert succeeds, re-fetch the user from the DB
                                            4. If the re-fetch succeeds, return the object to the caller
                                            */
                                            callback(null, result[0]);
                                        }
                                    }
                                );
                            }
                        }
                    );
                }
            });
        },
        createPost: function(post, callback) {
            conn.query(
                'INSERT INTO `posts` (`userId`, `title`, `url`, `createdAt`, `subredditId`) VALUES (?, ?, ?, ?, ?)', [post.userId, post.title, post.url, null, post.subredditId],
                function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        /*
                        Post inserted successfully. Let's use the result.insertId to retrieve
                        the post and send it to the caller!
                        */
                        conn.query(
                            'SELECT `id`,`title`,`url`,`userId`, `createdAt`, `updatedAt`, `subredditId` FROM `posts` WHERE `id` = ?', [result.insertId],
                            function(err, result) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    callback(null, result[0]);
                                }
                            });
                    }
                });
        },
        getAllPosts: function(options, callback) {
            // In case we are called without an options parameter, shift all the parameters manually
            if (!callback) {
                callback = options;
                options = {};
            }
            var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
            var offset = (options.page || 0) * limit;
            
            //get the query to retrive posts sorted by given parameter
            var sortedQuery = getQueryForSorting(options.sortingMethod);

            conn.query(
                sortedQuery, [limit, offset],
                function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        //map results to output in readable format
                        results = results.map(function(currObj) {
                            var formatResults = {
                                id: currObj.id,
                                title: currObj.title,
                                url: currObj.url,
                                createdAt: currObj.createdAt,
                                updatedAt: currObj.updatedAt,
                                //add user info in object
                                user: {
                                    id: currObj.userId,
                                    username: currObj.userUsername,
                                    createdAt: currObj.userCreatedAt,
                                    updatedAt: currObj.userUpdatedAt,
                                }
                            }
                            //check if subreddit info, and if yes add in object
                            if (currObj.subredditId) {
                                formatResults.subredditId = {
                                    id: currObj.subredditId,
                                    name: currObj.subredditName,
                                    description: currObj.subredditDescription,
                                    createdAt: currObj.subredditCreatedAt,
                                    updatedAt: currObj.subredditUpdatedAt
                                }
                            }
                            //check for a sorting value, such as hotness or controversy, and add
                            if (currObj.voteScore) {
                                formatResults.voteScore = currObj.voteScore;
                            }
                            if (currObj.hotness) {
                                formatResults.hotness = currObj.hotness;
                            }
                            if (currObj.controversyScore) {
                                formatResults.controversyScore = currObj.controversyScore;
                            }
                            return formatResults;
                        });
                        callback(null, results);
                    }
                });
        },
        getAllPostsForUser: function(userId, options, callback) {
            //if no options, shift parameters manually
            if (!callback) {
                callback = options;
                options = {};
            }
            var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
            var offset = (options.page || 0) * limit;

            conn.query(`
                SELECT id AS postId, title, url, createdAt, updatedAt FROM posts WHERE userId = ? LIMIT ? OFFSET ?
                `, [userId, limit, offset],
                function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    else if (!results[0]) {
                        callback(new Error("No posts for this user!"));
                    }
                    else {
                        callback(null, results);
                    }
                });
        },
        getSinglePost: function(postId, callback) {
            //bind `this` for later use inside function
            var that = this;
            conn.query(`
            SELECT id AS postID, userId, title, createdAt, updatedAt FROM posts WHERE id = ?
            `, [postId], function(err, results) {
                if (err) {
                    callback(err);
                }
                else if (!results[0]) {
                    callback(new Error("Invalid post ID!"));
                }
                else {
                    //get all comments for given postId
                    that.getCommentsForPost(postId, function(err, commentResult) {
                        if (err) {
                            callback(err);
                        }
                        else {
                            //push result from comments getCommentsForPost to result from getSinglePost
                            //will show the post on top with all nested comments below
                            results.push(commentResult);
                            callback(null, results);
                        }
                    });
                }
            });
        },
        createSubreddit: function(sub, callback) {
            conn.query(`
            INSERT INTO subreddits (name, description, createdAt) VALUES (?, ?, ?)`, [sub.name, sub.description, null],
                function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        conn.query(`
                        SELECT id AS subredditId, name AS subredditName, description AS subredditDescription, createdAt, updatedAt FROM subreddits WHERE name = ? 
                        `, [sub.name], function(err, result) {
                            if (err) {
                                if (err.code === 'ER_DUP_ENTRY') {
                                    callback(new Error('A subreddit with this name already exists'));
                                }
                                else {
                                    callback(err);
                                }
                            }
                            //if no error, `return` the subreddit and all associated info
                            else {
                                callback(null, result[0]);
                            }
                        });
                    }
                });
        },
        getAllSubreddits: function(callback) {
            //show all info for all subreddits
            conn.query(`
            SELECT id AS subredditId, name AS subredditName, description AS subredditDescription, createdAt, updatedAt FROM subreddits ORDER BY createdAt DESC`,
                function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        callback(null, result);
                    }
                });
        },
        createComment: function(comment, callback) {
            conn.query(`
            INSERT INTO comments (text, createdAt, parentId, postId, userId) VALUES (?, ?, ?, ?, ?)`, [comment.text, null, comment.parentId, comment.postId, comment.userId],
                function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        //if comment creation succeded, show all associated info for this commetn
                        conn.query(`
                        SELECT * FROM comments WHERE id = ?`, [result.insertId],
                            function(err, result) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    callback(null, result[0]);
                                }
                            });
                    }
                });
        },
        getCommentsForPost: function(postId, callback) {
            //join comment table together three times
            //join first children to parents
            //then join second children to first children
            //only select rows where parent's parent is NULL
            //therefore all parent identified as parents
            //first children identified as c1
            //second children identified as c2
            //perform inner queries to join usernames to comments
            conn.query(
            `SELECT p.id AS parentId, p.text AS parentText, p.createdAt as parentCreatedAt, p.updatedAt AS parentUpdatedAt,
            p.parentId AS parentParentId, p.userId AS parentUserId, p.username AS parentUserName, p.postId,
            c1.id AS c1Id, c1.text AS c1Text, c1.createdAt as c1CreatedAt, c1.updatedAt AS c1UpdatedAt,
            c1.parentId AS c1ParentId, c1.userId AS c1UserId, c1.username AS c1UserName,
            c2.id AS c2Id, c2.text AS c2Text, c2.createdAt as c2CreatedAt, c2.updatedAt AS c2UpdatedAt,
            c2.parentId AS c2ParentId, c2.userId AS c2UserId, c2.userName AS c2UserName
            FROM 
            (SELECT u.username, c.id, c.text, c.createdAt, c.updatedAt,
            c.parentId, c.userId, c.postId FROM comments c LEFT JOIN users u ON u.id = c.userId) AS p
            LEFT JOIN 
            (SELECT u.username, c.id, c.text, c.createdAt, c.updatedAt,
            c.parentId, c.userId FROM comments c LEFT JOIN users u ON u.id = c.userId) AS c1
            ON (c1.parentId = p.id) 
            LEFT JOIN 
            (SELECT u.username, c.id, c.text, c.createdAt, c.updatedAt,
            c.parentId, c.userId FROM comments c LEFT JOIN users u ON u.id = c.userId) AS c2
            ON (c2.parentId = c1.id) WHERE p.postId = ? AND p.parentId IS NULL ORDER BY p.createdAt, c1.createdAt, c2.createdAt`, [postId],
                function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    else if (!result[0]) {
                        callback(new Error("This post has no comments"));
                    }
                    else {
                        //perform reduce on results array, starting with empty array
                        result = result.reduce(function(finalArr, currObj) {
                            //if nothing in array, take first parent comment and add it
                            if (finalArr.length === 0) {
                                finalArr.push(newComment(currObj, "parent"));
                            }
                            else {
                                //check to see if parent already exists 
                                var parentIndex = -1;
                                finalArr.forEach(function(post, index) {
                                    if (post.id === currObj.parentId) {
                                        //if yes, save index of this parent
                                        parentIndex = index;
                                        return;
                                    }
                                });
                                //if yes, and if this parent has a c1 child
                                if (parentIndex !== -1 && currObj.c1Id) {
                                    //check if this is the first c1, if yes, create replies
                                    if (!finalArr[parentIndex].replies) {
                                        finalArr[parentIndex].replies = [];
                                        //push c1 (and its c2 if it exists)
                                        finalArr[parentIndex].replies.push(newComment(currObj, "c1"));
                                    }
                                    else {
                                        //if not the first c1, check to see if it already exists
                                        var c1Index = -1;
                                        finalArr[parentIndex].replies.forEach(function(child, childIndex) {
                                            if (child.id === currObj.c1Id) {
                                                c1Index = childIndex;
                                                return;
                                            }
                                        });
                                        //c1 exists, and has a c2
                                        if (c1Index !== -1 && currObj.c2Id) {
                                            //add this c2
                                            finalArr[parentIndex].replies[c1Index].replies.push(newComment(currObj, "c2"));
                                        }
                                        //c1 does not exist, add it (and its c2 if it has)
                                        else {
                                            finalArr[parentIndex].replies.push(newComment(currObj, "c1"));
                                        }
                                    }

                                }
                                //if comment is not inside final array and it is a parent, create new parent
                                else {
                                    //add its c1 and c2 if it has
                                    finalArr.push(newComment(currObj, "parent"));
                                }
                            }
                            return finalArr;
                        }, []);
                    }
                    callback(null, result)
                });
        },
        createOrUpdateVote: function(vote, callback) {
            if (vote.vote === 1 || vote.vote === -1 || vote.vote === 0) {
                conn.query(
                    `INSERT INTO votes SET postId = ?, userId = ?, vote = ?, createdAt = ? ON DUPLICATE KEY UPDATE vote = ?`, [vote.postId, vote.userId, vote.vote, null, vote.vote],
                    function(err, result) {
                        if (err) {
                            callback(err);
                        }
                        else {
                            //if no error, show created or updated vote
                            conn.query(
                                `SELECT * FROM votes WHERE userId = ? AND postId = ?`, [vote.userId, vote.postId],
                                function(err, vote) {
                                    if (err) {
                                        callback(err);
                                    }
                                    else {
                                        callback(null, vote);
                                    }
                                });
                        }
                    });
            }
            else {
                callback(new Error("Vote must be 1, -1, or 0."));
            }
        }
    }
}

//create new comments in final array
function newComment(currObj, level) {
    var newCommentObj = {};
    newCommentObj.id = currObj[`${level}Id`];
    newCommentObj.text = currObj[`${level}Text`];
    newCommentObj.createdAt = currObj[`${level}CreatedAt`];
    newCommentObj.updatedAt = currObj[`${level}UpdatedAt`];
    newCommentObj.username = currObj[`${level}UserName`];
    //if this is a parent level comment, check if it has a c1 and add it
    if (level === "parent") {
        if (currObj.c1Id) {
            newCommentObj.replies = [];
            newCommentObj.replies.push(newComment(currObj, "c1"));
        }
    }
    //if this is a c1 level comment, check if it has a c2 and add it
    if (level === "c1") {
        if (currObj.c2Id) {
            newCommentObj.replies = [];
            newCommentObj.replies.push(newComment(currObj, "c2"));
        }
    }
    return newCommentObj;
}

//function to return appropriate mySQL query given a sorting parameter
function getQueryForSorting(sortingMethod) {
    //variable parameters
    var extraQuery = "";
    var extraJoin = "";
    var orderBy = "p.createdAt";
    var groupBy = "";
    if (sortingMethod) {
        if (sortingMethod === "top") {
            extraQuery = ", SUM(v.vote) AS voteScore";
            extraJoin = "LEFT JOIN votes v ON v.postId = p.id";
            orderBy = "voteScore";
            groupBy = "GROUP BY p.id"
        }
        else if (sortingMethod === "hot" || sortingMethod === "hotness") {
            extraQuery = ", SUM(v.vote)/(NOW()-v.createdAt) AS hotness";
            extraJoin = "LEFT JOIN votes v ON v.postId = p.id WHERE v.vote = 1";
            orderBy = "hotness";
            groupBy = "GROUP BY p.id"
        }
        else if (sortingMethod === "controversial") {
            extraQuery = ", if(SUM(vote) < 0, COUNT(*) * (sum(if(vote >0, 1, 0))/sum(if(vote<0, 1, 0))), (COUNT(*) * (sum(if(vote<0, 1, 0))/(sum(if(vote >0, 1, 0)))))) as controversyScore";
            extraJoin = "LEFT JOIN votes v ON v.postId = p.id";
            orderBy = "controversyScore";
            groupBy = "GROUP BY p.id"
        }
    }
    //general query
    var query = `SELECT p.id, p.title, p.url, p.userId, p.createdAt, p.updatedAt, 
                u.id AS userId, u.username AS userUsername, u.createdAt AS userCreatedAt, u.updatedAt AS userUpdatedAt,
                s.id AS subredditId, s.name AS subredditName, s.description AS subredditDescription, 
                s.createdAt AS subredditCreatedAt, s.updatedAt AS subredditUpdatedAt
                ${extraQuery}
                FROM posts p JOIN users u ON p.userId = u.id LEFT JOIN subreddits s ON s.id = p.subredditId
                ${extraJoin}
                ${groupBy}
                ORDER BY ${orderBy} DESC
                LIMIT ? OFFSET ?`

    return query;
}
