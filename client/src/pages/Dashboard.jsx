import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from '../components/AppHeader.jsx';
import AddAssetForm from '../components/AddAssetForm.jsx';
import AssetTable, { AssetTableSkeleton } from '../components/AssetTable.jsx';
import MoveAssetDialog from '../components/MoveAssetDialog.jsx';
import DeleteAssetDialog from '../components/DeleteAssetDialog.jsx';
import Alert from '../components/Alert.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { useToast } from '../components/Toasts.jsx';
import { api } from '../lib/api.js';
import { useDebouncedValue, useDocumentTitle, useSlowFlag } from '../lib/hooks.js';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function uniqueSorted(values) {
  return [...new Set(values)].sort(collator.compare);
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { notify } = useToast();

  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const slow = useSlowFlag(status === 'loading');

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [room, setRoom] = useState('');
  const [sort, setSort] = useState({ key: 'id', dir: 'desc' });
  const debouncedQuery = useDebouncedValue(query);

  const [moving, setMoving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      setAssets(await api.listAssets());
      setStatus('ready');
    } catch (err) {
      if (err.status === 401) return;
      setLoadError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (highlightId === null) return undefined;
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const categories = useMemo(() => uniqueSorted(assets.map((a) => a.category)), [assets]);
  const rooms = useMemo(() => uniqueSorted(assets.map((a) => a.room_number)), [assets]);

  const visible = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase().replace(/^#0*/, '');
    const filtered = assets.filter((a) => {
      if (category && a.category !== category) return false;
      if (room && a.room_number !== room) return false;
      if (!needle) return true;
      return (
        a.item_name.toLowerCase().includes(needle) ||
        a.category.toLowerCase().includes(needle) ||
        a.room_number.toLowerCase().includes(needle) ||
        String(a.id) === needle
      );
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) =>
      sort.key === 'id' ? (a.id - b.id) * dir : collator.compare(a[sort.key], b[sort.key]) * dir || b.id - a.id,
    );
  }, [assets, debouncedQuery, category, room, sort]);

  // Drop a filter whose last matching asset was moved or deleted, so the select never shows a stale value.
  useEffect(() => {
    if (category && !categories.includes(category)) setCategory('');
    if (room && !rooms.includes(room)) setRoom('');
  }, [categories, rooms, category, room]);

  const filtersActive =query.trim() !== '' || category !== '' || room !== '';

  function clearFilters() {
    setQuery('');
    setCategory('');
    setRoom('');
  }

  function handleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'id' ? 'desc' : 'asc' }));
  }

  function handleCreated(asset) {
    setAssets((list) => [asset, ...list]);
    setHighlightId(asset.id);
    notify(`Added “${asset.item_name}” to room ${asset.room_number}.`);
  }

  function handleMoved(updated) {
    setAssets((list) => list.map((a) => (a.id === updated.id ? updated : a)));
    setMoving(null);
    setHighlightId(updated.id);
    notify(`Moved “${updated.item_name}” to room ${updated.room_number}.`);
  }

  function handleDeleted(asset) {
    setAssets((list) => list.filter((a) => a.id !== asset.id));
    setDeleting(null);
    notify(`Deleted “${asset.item_name}” from the register.`);
  }

  function handleGone(asset) {
    setAssets((list) => list.filter((a) => a.id !== asset.id));
    setMoving(null);
    setDeleting(null);
    notify(`“${asset.item_name}” had already been removed, so the list was refreshed.`, 'warning');
  }

  return (
    <>
      <AppHeader />
      <main id="main" className="page dashboard">
        <div className="page__head">
          <div>
            <h1 className="page__title">Hardware register</h1>
            <p className="page__lede">Every tracked device and the room it's assigned to.</p>
          </div>
          {status !== 'error' && (
            <dl className="stats" aria-label="Register summary" aria-busy={status === 'loading'}>
              {[
                ['Assets', assets.length],
                ['Rooms', rooms.length],
                ['Categories', categories.length],
              ].map(([label, value]) => (
                <div className="stat" key={label}>
                  <dt>{label}</dt>
                  <dd className="mono">{status === 'loading' ? <span className="skeleton skeleton--stat" /> : value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="dashboard__grid">
          <aside className="dashboard__aside">
            <AddAssetForm categories={categories} rooms={rooms} onCreated={handleCreated} />
          </aside>

          <section className="dashboard__main card" aria-labelledby="inventory-heading">
            <div className="toolbar">
              <h2 id="inventory-heading" className="card__title">
                Inventory
              </h2>
              <div className="toolbar__filters" role="search">
                <div className="search">
                  <label htmlFor="asset-search" className="visually-hidden">
                    Search assets
                  </label>
                  <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
                  </svg>
                  <input
                    id="asset-search"
                    type="search"
                    className="field__input search__input"
                    placeholder="Search name, category, room or ID"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={status !== 'ready'}
                  />
                </div>
                <label className="visually-hidden" htmlFor="filter-category">
                  Filter by category
                </label>
                <select
                  id="filter-category"
                  className="field__input select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={status !== 'ready'}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <label className="visually-hidden" htmlFor="filter-room">
                  Filter by room
                </label>
                <select
                  id="filter-room"
                  className="field__input select"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  disabled={status !== 'ready'}
                >
                  <option value="">All rooms</option>
                  {rooms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {status === 'loading' && (
              <>
                <p className="visually-hidden" role="status">
                  Loading inventory…
                </p>
                {slow && (
                  <p className="slow-hint slow-hint--block" role="status">
                    Still loading. The server or your connection is slow right now.
                  </p>
                )}
                <AssetTableSkeleton />
              </>
            )}

            {status === 'error' && (
              <div className="state">
                <Alert
                  tone="error"
                  live
                  title="The inventory couldn't be loaded"
                  action={
                    <button type="button" className="btn btn--secondary btn--sm" onClick={load}>
                      Try again
                    </button>
                  }
                >
                  {loadError?.message}
                </Alert>
              </div>
            )}

            {status === 'ready' && assets.length === 0 && (
              <div className="state state--empty">
                <svg className="state__art" viewBox="0 0 64 64" aria-hidden="true">
                  <rect x="10" y="14" width="44" height="36" rx="4" />
                  <path d="M10 24h44M20 32h16M20 40h10" />
                </svg>
                <h3 className="state__title">The register is empty</h3>
                <p className="state__text">
                  Add the first device with the form{' '}
                  <span className="only-wide">on the left</span>
                  <span className="only-narrow">above</span>. Every staff member will see it here.
                </p>
              </div>
            )}

            {status === 'ready' && assets.length > 0 && visible.length === 0 && (
              <div className="state">
                <h3 className="state__title">No assets match these filters</h3>
                <p className="state__text">Try a different search term or clear the filters.</p>
                <button type="button" className="btn btn--secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )}

            {status === 'ready' && visible.length > 0 && (
              <>
                <p className="result-count" role="status">
                  {filtersActive ? (
                    <>
                      Showing <span className="mono">{visible.length}</span> of{' '}
                      <span className="mono">{assets.length}</span> assets ·{' '}
                      <button type="button" className="link-button" onClick={clearFilters}>
                        Clear filters
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="mono">{assets.length}</span> {assets.length === 1 ? 'asset' : 'assets'}
                    </>
                  )}
                </p>
                <AssetTable
                  assets={visible}
                  sort={sort}
                  onSort={handleSort}
                  onMove={setMoving}
                  onDelete={setDeleting}
                  highlightId={highlightId}
                  caption="Tracked hardware assets"
                />
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />

      {moving && (
        <MoveAssetDialog asset={moving} onClose={() => setMoving(null)} onMoved={handleMoved} onGone={handleGone} />
      )}
      {deleting && (
        <DeleteAssetDialog
          asset={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
          onGone={handleGone}
        />
      )}
    </>
  );
}
