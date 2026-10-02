const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'item_name', label: 'Item' },
  { key: 'category', label: 'Category' },
  { key: 'room_number', label: 'Room' },
];

const SORT_ICON_PATHS = {
  none: 'M3 4.5 6 1.5l3 3M3 7.5l3 3 3-3',
  asc: 'M3 7.5 6 4.5l3 3',
  desc: 'M3 4.5l3 3 3-3',
};

function SortHeader({ column, sort, onSort }) {
  const active = sort.key === column.key;
  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" aria-sort={ariaSort} className={`col-${column.key}`}>
      <button type="button" className="sort-button" onClick={() => onSort(column.key)}>
        {column.label}
        <svg className={`sort-icon ${active ? `sort-icon--${sort.dir}` : ''}`} viewBox="0 0 12 12" aria-hidden="true">
          <path d={SORT_ICON_PATHS[active ? sort.dir : 'none']} />
        </svg>
      </button>
    </th>
  );
}

export function AssetTableSkeleton({ rows = 6 }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <table className="asset-table asset-table--skeleton">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} className={`col-${c.key}`}>
                {c.label}
              </th>
            ))}
            <th className="col-actions">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              {[...COLUMNS, { key: 'actions' }].map((c) => (
                <td key={c.key} className={`col-${c.key}`}>
                  <span className="skeleton" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AssetTable({ assets, sort, onSort, onMove, onDelete, highlightId, caption }) {
  return (
    <div className="table-wrap">
      <table className="asset-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <SortHeader key={column.key} column={column} sort={sort} onSort={onSort} />
            ))}
            <th scope="col" className="col-actions">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className={asset.id === highlightId ? 'is-highlighted' : undefined}>
              <td className="col-id mono" data-label="ID">
                #{String(asset.id).padStart(4, '0')}
              </td>
              <th scope="row" className="col-item_name" data-label="Item">
                {asset.item_name}
              </th>
              <td className="col-category" data-label="Category">
                <span className="tag">{asset.category}</span>
              </td>
              <td className="col-room_number mono" data-label="Room">
                {asset.room_number}
              </td>
              <td className="col-actions">
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => onMove(asset)}
                    aria-label={`Move ${asset.item_name} (#${asset.id}) to another room`}
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--sm"
                    onClick={() => onDelete(asset)}
                    aria-label={`Delete ${asset.item_name} (#${asset.id})`}
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
