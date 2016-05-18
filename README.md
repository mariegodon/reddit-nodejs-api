# Reddit Clone

Full Reddit Clone with user login, threaded comments, up/down voting, posting, and post sorting. The current logged in user is stored in a session token, and this user can vote, post, and comment. All information is linked to a MySQL database. 

* reddit.js: Contains all functions which take data, such as user id and post information, and either insert information into or get information from a MySQL database. Also outputs information as an API, very similar to the reddit API, linking a single post to all threaded comments, users, and subreddits.
* JSX functions making use of ES6 syntax are used to render HTML.
* MySQL database links users, posts, votes, and comments. Votes includes condition to ensure one user can only vote once per post.
* Front-end styled with Sass.
* jQuery used to improve user experience. For example, when a user enters a post url, jQuery is used to make an AJAX $.get request to this url and suggest a title. jQuery also controls Reddit icon animation, ensuring smooth transitions on/off hover.
* Server is built on Express.js
