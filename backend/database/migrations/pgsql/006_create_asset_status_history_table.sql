-- Audit log: one row per status or assignment change on an asset, so
-- "who had this laptop before, and when did it go into repair" is always
-- reconstructable instead of only ever showing the asset's current state.
CREATE TABLE asset_status_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    changed_by INTEGER NULL REFERENCES users (id) ON DELETE SET NULL,
    previous_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    previous_assigned_to VARCHAR(150) NULL,
    new_assigned_to VARCHAR(150) NULL,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_status_history_asset_id ON asset_status_history (asset_id, created_at);
