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
                            }
                        );
                    }
                }
            );
        },
        getAllPosts: function(options, callback) {
            // In case we are called without an options parameter, shift all the parameters manually
            if (!callback) {
                callback = options;
                options = {};
            }
            var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
            var offset = (options.page || 0) * limit;

            conn.query(`
                SELECT p.id, p.title, p.url, p.userId, p.createdAt, p.updatedAt, 
                u.id AS userId, u.username AS userUsername, u.createdAt AS userCreatedAt, u.updatedAt AS userUpdatedAt,
                s.id AS subredditId, s.name AS subredditName, s.description AS subredditDescription, 
                s.createdAt AS subredditCreatedAt, s.updatedAt AS subredditUpdatedAt
                FROM posts p JOIN users u ON p.userId = u.id LEFT JOIN subreddits s ON s.id = p.subredditId
                ORDER BY p.createdAt DESC
                LIMIT ? OFFSET ?
            `, [limit, offset],
                function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        results = results.map(function(currObj) {
                            var formatResults = {
                                id: currObj.id,
                                title: currObj.title,
                                url: currObj.url,
                                createdAt: currObj.createdAt,
                                updatedAt: currObj.updatedAt,
                                user: {
                                    id: currObj.userId,
                                    username: currObj.userUsername,
                                    createdAt: currObj.userCreatedAt,
                                    updatedAt: currObj.userUpdatedAt,
                                },
                                subreddit: {
                                    id: currObj.subredditId,
                                    name: currObj.subredditName,
                                    description: currObj.subredditDescription,
                                    createdAt: currObj.subredditCreatedAt,
                                    updatedAt: currObj.subredditUpdatedAt
                                }
                            }
                            return formatResults;
                        });
                        callback(null, results);
                    }
                }
            );
        },
        getAllPostsForUser: function(userId, options, callback) {
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
                    callback(null, results[0]);
                }
            });
        },
        createSubreddit: function(sub, callback) {
            //var description = sub.description || null;
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
                            else {
                                callback(null, result[0]);
                            }
                        });
                    }
                });
        },
        getAllSubreddits: function(callback) {
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
                        conn.query(`
                        SELECT * FROM comments WHERE id = ?`, [result.insertId],
                            function(err, result) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    callback(result[0]);
                                }
                            });
                    }
                });
        }
    }
}
