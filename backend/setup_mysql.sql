DROP DATABASE IF EXISTS revesta_db;
CREATE DATABASE revesta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'revesta'@'localhost' IDENTIFIED BY 'Lyonstudios00';
CREATE USER IF NOT EXISTS 'revesta'@'127.0.0.1' IDENTIFIED BY 'Lyonstudios00';
GRANT ALL PRIVILEGES ON revesta_db.* TO 'revesta'@'localhost';
GRANT ALL PRIVILEGES ON revesta_db.* TO 'revesta'@'127.0.0.1';
FLUSH PRIVILEGES;
