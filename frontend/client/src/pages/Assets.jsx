import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import Alert from '../components/Alert.jsx';
import BackendLoginPanel from '../components/BackendLoginPanel.jsx';
import AddManagedAssetForm from '../components/AddManagedAssetForm.jsx';
import ManagedAssetTable from '../components/ManagedAssetTable.jsx';
import EditManagedAssetDialog from '../components/EditManagedAssetDialog.jsx';
import AssetHistoryDialog from '../components/AssetHistoryDialog.jsx';
import { useAuth } from '../lib/auth.jsx';
import { backendApi, getBackendSession } from '../lib/backendApi.js';
import { useDebouncedValue, useDocumentTitle, useMediaQuery } from '../lib/hooks.js';
import { ASSET_STATUSES, ASSET_STATUS_LABELS } from '../lib/assetStatus.js';

/**
 * Asset management, powered by backend/ (the merged inventory-api) rather
 * than this app's own server/. Additive to the existing Dashboard: nothing
 * here changes the room register, it just makes the richer asset model
 * (tag, status, assignment, location, purchase/warranty info, history)
 * usable end to end.
 */
export default function Assets() {
  useDocumentTitle('Asset management');
  const { status: appAuthStatus } = useAuth();

  const [signedIn, setSignedIn] = useState(() => backendApi.isAuthenticated());
  const [assets, setAssets] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [editing, setEditing] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);

  const wide = useMediaQuery('(min-width: 960px)');
  const [addOpen, setAddOpen] = useState(false);
  const showAddForm = wide || addOpen;

  const load = useCallback(async () => {
    setLoadStatus('loading');
    setLoadError(null);
    try {
      const { data, meta: pageMeta } = await backendApi.listAssets({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setAssets(data);
      setMeta(pageMeta);
      setLoadStatus('ready');
    } catch (err) {
      setLoadError(err);
      setLoadStatus('error');
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const session = useMemo(() => getBackendSession(), [signedIn]);

  function handleCreated(asset) {
    setAssets((list) => [asset, ...list]);
    setAddOpen(false);
  }

  function handleSaved(updated) {
    setAssets((list) => list.map((a) => (a.id === updated.id ? updated : a)));
    setEditing(null);
  }

  function handleGone(asset) {
    setAssets((list) => list.filter((a) => a.id !== asset.id));
    setEditing(null);
  }

  async function handleDelete(asset) {
    if (!window.confirm(`Delete "${asset.name}" (${asset.asset_tag})? This also removes its history.`)) return;
    try {
      await backendApi.deleteAsset(asset.id);
      setAssets((list) => list.filter((a) => a.id !== asset.id));
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        setAssets((list) => list.filter((a) => a.id !== asset.id));
      } else {
        window.alert(err.message);
      }
    }
  }

  function handleSignOut() {
    backendApi.logout().finally(() => setSignedIn(false));
  }

  return (
    <>
      {appAuthStatus === 'authenticated' ? (
        <AppHeader />
      ) : (
        <header className="app-header">
          <div className="app-header__inner">
            <Link to="/" className="brand">
              <span className="brand__name">Asset Register</span>
            </Link>
          </div>
        </header>
      )}
      <main id="main" className="page dashboard">
        <div className="page__head">
          <div>
            <h1 className="page__title">Asset management</h1>
            <p className="page__lede">
              Individually tracked assets — tag, status, assignment, location, and purchase/warranty info — served by{' '}
              <span className="mono">backend/</span>.
            </p>
          </div>
          {session && (
            <div className="app-header__user">
              <span className="app-header__who">
                <span className="visually-hidden">Backend account: </span>
                <span className="mono">{session.email}</span>
              </span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleSignOut}>
                Sign out of backend
              </button>
            </div>
          )}
        </div>

        {!signedIn ? (
          <BackendLoginPanel onSignedIn={() => setSignedIn(true)} />
        ) : (
          <div className="dashboard__grid">
            <aside className="dashboard__aside">
              {!wide && (
                <button
                  type="button"
                  className={`btn btn--block ${addOpen ? 'btn--secondary' : 'btn--primary'}`}
                  aria-expanded={addOpen}
                  onClick={() => setAddOpen((v) => !v)}
                >
                  {addOpen ? 'Close form' : '+ Add asset'}
                </button>
              )}
              {showAddForm && <AddManagedAssetForm onCreated={handleCreated} autoFocus={!wide} />}
            </aside>

            <section className="dashboard__main card" aria-labelledby="assets-heading">
              <div className="toolbar">
                <h2 id="assets-heading" className="card__title">
                  Assets
                </h2>
                <div className="toolbar__filters" role="search">
                  <div className="search">
                    <label htmlFor="asset-search" className="visually-hidden">
                      Search assets
                    </label>
                    <input
                      id="asset-search"
                      type="search"
                      className="field__input search__input"
                      placeholder="Search tag, name, or serial number"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <label className="visually-hidden" htmlFor="filter-status">
                    Filter by status
                  </label>
                  <select
                    id="filter-status"
                    className="field__input select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {ASSET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ASSET_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadStatus === 'loading' && (
                <p className="visually-hidden" role="status">
                  Loading assets…
                </p>
              )}

              {loadStatus === 'error' && (
                <div className="state">
                  <Alert
                    tone="error"
                    live
                    title="Assets couldn't be loaded"
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

              {loadStatus === 'ready' && assets.length === 0 && (
                <div className="state state--empty">
                  <h3 className="state__title">No assets found</h3>
                  <p className="state__text">
                    {search || statusFilter
                      ? 'Try a different search term or status filter.'
                      : `Add the first asset with the ${wide ? 'form on the left' : '"Add asset" button above'}.`}
                  </p>
                </div>
              )}

              {loadStatus === 'ready' && assets.length > 0 && (
                <>
                  <ManagedAssetTable
                    assets={assets}
                    onEdit={setEditing}
                    onHistory={setViewingHistory}
                    onDelete={handleDelete}
                  />
                  {meta && meta.totalPages > 1 && (
                    <div className="row-actions" style={{ justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={meta.page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </button>
                      <span className="mono" aria-live="polite">
                        Page {meta.page} of {meta.totalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={meta.page >= meta.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />

      {editing && (
        <EditManagedAssetDialog asset={editing} onClose={() => setEditing(null)} onSaved={handleSaved} onGone={handleGone} />
      )}
      {viewingHistory && <AssetHistoryDialog asset={viewingHistory} onClose={() => setViewingHistory(null)} />}
    </>
  );
}
