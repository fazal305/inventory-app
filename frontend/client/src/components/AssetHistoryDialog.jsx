import { useEffect, useState } from 'react';
import Dialog from './Dialog.jsx';
import Alert from './Alert.jsx';
import { backendApi } from '../lib/backendApi.js';
import { ASSET_STATUS_LABELS } from '../lib/assetStatus.js';

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function describe(entry) {
  const statusChanged = entry.previous_status !== entry.new_status;
  const assignmentChanged = entry.previous_assigned_to !== entry.new_assigned_to;

  if (entry.previous_status === null) {
    return 'Asset created.';
  }
  const parts = [];
  if (statusChanged) {
    parts.push(
      `Status changed from ${ASSET_STATUS_LABELS[entry.previous_status] ?? entry.previous_status} to ${
        ASSET_STATUS_LABELS[entry.new_status] ?? entry.new_status
      }.`,
    );
  }
  if (assignmentChanged) {
    const from = entry.previous_assigned_to ?? 'unassigned';
    const to = entry.new_assigned_to ?? 'unassigned';
    parts.push(`Assignment changed from ${from} to ${to}.`);
  }
  return parts.join(' ') || 'Updated.';
}

/** Read-only view of an asset's status/assignment audit trail (GET /assets/{id}/history). */
export default function AssetHistoryDialog({ asset, onClose }) {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    backendApi
      .getAssetHistory(asset.id)
      .then((data) => {
        if (!cancelled) {
          setEntries(data);
          setStatus('ready');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Asset history"
      description={
        <>
          <span className="mono">{asset.asset_tag}</span> — {asset.name}
        </>
      }
    >
      <div className="dialog__form">
        {status === 'loading' && (
          <p role="status">Loading history…</p>
        )}
        {status === 'error' && (
          <Alert tone="error" live title="Couldn't load history">
            {error?.message}
          </Alert>
        )}
        {status === 'ready' && entries.length === 0 && <p>No history recorded yet.</p>}
        {status === 'ready' && entries.length > 0 && (
          <ul className="history-list">
            {entries.map((entry) => (
              <li key={entry.id} className="history-list__item">
                <p className="history-list__text">{describe(entry)}</p>
                <p className="history-list__meta mono">
                  {formatter.format(new Date(entry.created_at))}
                  {entry.changed_by_name ? ` · ${entry.changed_by_name}` : ''}
                </p>
                {entry.note && <p className="history-list__note">{entry.note}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
