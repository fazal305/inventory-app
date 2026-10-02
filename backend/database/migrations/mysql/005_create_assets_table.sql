-- Individually tracked assets (as opposed to `products`, which is bulk
-- retail stock). Each row is one identifiable physical item: a laptop, a
-- forklift, a monitor — tracked by tag/serial, current status, who or where
-- it is assigned to, and its purchase/warranty info.
CREATE TABLE assets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    asset_tag VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    category_id INT UNSIGNED NULL,
    serial_number VARCHAR(100) NULL,
    -- Kept as VARCHAR + CHECK rather than MySQL's ENUM so the same column
    -- definition works unchanged under both the mysql/ and pgsql/ migration
    -- paths (see products.quantity's CHECK for the same reasoning).
    status VARCHAR(20) NOT NULL DEFAULT 'in_storage',
    assigned_to VARCHAR(150) NULL,
    location VARCHAR(150) NULL,
    purchase_date DATE NULL,
    purchase_cost DECIMAL(10,2) NULL,
    warranty_expires_at DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_assets_asset_tag (asset_tag),
    UNIQUE KEY uq_assets_serial_number (serial_number),
    KEY idx_assets_category_id (category_id),
    KEY idx_assets_status (status),
    CONSTRAINT fk_assets_category
        FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE SET NULL,
    CONSTRAINT chk_assets_status
        CHECK (status IN ('in_use', 'in_storage', 'under_repair', 'retired', 'disposed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
