-- Staff Hardware Asset system schema (MySQL 8 / MariaDB 10.6+).
-- Safe to re-run: every statement is idempotent.

CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    -- password_hash() output; never plain text.
    password VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    INDEX idx_assets_category (category),
    INDEX idx_assets_room_number (room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sliding-window rate limiting. One row per counted request.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bucket VARCHAR(120) NOT NULL,
    hit_at DATETIME(3) NOT NULL,
    INDEX idx_rate_limit_bucket_time (bucket, hit_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
