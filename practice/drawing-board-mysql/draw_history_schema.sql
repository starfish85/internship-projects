CREATE DATABASE IF NOT EXISTS draw_db;
USE draw_db;

CREATE TABLE IF NOT EXISTS draw_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    canvas_width INT DEFAULT 0,
    canvas_height INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_file_name (file_name),
    INDEX idx_created_at (created_at)
);
