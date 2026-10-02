-- Individually tracked assets (as opposed to `products`, which is bulk
-- retail stock). Each row is one identifiable physical item: a laptop, a
-- forklift, a monitor — tracked by tag/serial, current status, who or where
-- it is assigned to, and its purchase/warranty info.
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_tag VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category_id INTEGER NULL REFERENCES categories (id) ON DELETE SET NULL,
    serial_number VARCHAR(100) NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_storage'
        CHECK (status IN ('in_use', 'in_storage', 'under_repair', 'retired', 'disposed')),
    assigned_to VARCHAR(150) NULL,
    location VARCHAR(150) NULL,
    purchase_date DATE NULL,
    purchase_cost NUMERIC(10,2) NULL,
    warranty_expires_at DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_category_id ON assets (category_id);
CREATE INDEX idx_assets_status ON assets (status);

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
