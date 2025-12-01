CREATE DATABASE IF NOT EXISTS medical_annotation
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'jwu'@'localhost' IDENTIFIED BY 'abc123';

GRANT ALL PRIVILEGES ON medical_annotation.* TO 'jwu'@'localhost';

FLUSH PRIVILEGES;
