-- This creates the users table. The username field is constrained to unique
-- values only, by using a UNIQUE KEY on that column
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(60) NOT NULL, -- why 60??? ask me :)
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- This creates the posts table. The userId column references the id column of
-- users. If a user is deleted, the corresponding posts' userIds will be set NULL.
CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(300) DEFAULT NULL,
  `url` varchar(2000) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--This creates subreddits table. Id is primary key, description is optional, name has unique constraint.
CREATE TABLE `subreddits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--Alter table posts. Add column subredditId which references primary key id in subreddits table.
ALTER TABLE posts ADD COLUMN (`subredditId` INT);
ALTER TABLE posts ADD FOREIGN KEY (`subredditId`) REFERENCES subreddits(`id`) ON DELETE SET NULL; 

--Create comments table with id primary key.
CREATE TABLE `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
   `text` VARCHAR(10000) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `parentId` INT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
 --Add foreign key to parentId which references own column id
ALTER TABLE comments ADD FOREIGN KEY (`parentId`) REFERENCES comments(`id`) ON DELETE SET NULL;
--Was getting a weird error 
--mysql> ALTER TABLE comments ADD FOREIGN KEY (`postId`) REFERENCES posts(`id`) ON DELETE SET NULL;
--ERROR 1005 (HY000): Can't create table 'reddit.#sql-8d8_5e' (errno: 150)
--therefore deleted the rows and readded them with foreign key immediately
ALTER TABLE comments ADD COLUMN (postId INT, FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE SET NULL);
ALTER TABLE comments ADD COLUMN (userId INT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL); 