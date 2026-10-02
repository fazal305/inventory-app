import { ASSET_STATUS_LABELS } from '../lib/assetStatus.js';

export default function ManagedAssetTable({ assets, onEdit, onHistory, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="asset-table">
        <caption className="visually-hidden">Tracked assets from the backend API</caption>
        <thead>
          <tr>
            <th scope="col">Tag</th>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
            <th scope="col">Assigned to</th>
            <th scope="col">Location</th>
            <th scope="col">Warranty</th>
            <th scope="col" className="col-actions">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td className="mono" data-label="Tag">
                {asset.asset_tag}
              </td>
              <th scope="row" data-label="Name">
                {asset.name}
              </th>
              <td data-label="Status">
                <span className={`tag tag--status-${asset.status}`}>{ASSET_STATUS_LABELS[asset.status] ?? asset.status}</span>
              </td>
              <td data-label="Assigned to">{asset.assigned_to ?? <span className="muted">Unassigned</span>}</td>
              <td data-label="Location">{asset.location ?? <span className="muted">—</span>}</td>
              <td className="mono" data-label="Warranty">
                {asset.warranty_expires_at ?? <span className="muted">—</span>}
              </td>
              <td className="col-actions">
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => onEdit(asset)}
                    aria-label={`Update ${asset.name} (${asset.asset_tag})`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onHistory(asset)}
                    aria-label={`View history for ${asset.name} (${asset.asset_tag})`}
                  >
                    History
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--sm"
                    onClick={() => onDelete(asset)}
                    aria-label={`Delete ${asset.name} (${asset.asset_tag})`}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
