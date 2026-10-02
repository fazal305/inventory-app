-- Audit log: one row per status or assignment change on an asset, so
-- "who had this laptop before, and when did it go into repair" is always
-- reconstructable instead of only ever showing the asset's current state.
CREATE TABLE asset_status_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    asset_id INT UNSIGNED NOT NULL,
    changed_by INT UNSIGNED NULL,
    previous_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    previous_assigned_to VARCHAR(150) NULL,
    new_assigned_to VARCHAR(150) NULL,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_asset_status_history_asset_id (asset_id, created_at),
    CONSTRAINT fk_asset_status_history_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_asset_status_history_user
        FOREIGN KEY (changed_by) REFERENCES users (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
