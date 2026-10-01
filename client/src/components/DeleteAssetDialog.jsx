import { useState } from 'react';
import Dialog from './Dialog.jsx';
import Alert from './Alert.jsx';
import { api } from '../lib/api.js';
import { useSlowFlag } from '../lib/hooks.js';

export default function DeleteAssetDialog({ asset, onClose, onDeleted, onGone }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const slow = useSlowFlag(deleting);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await api.deleteAsset(asset.id);
      onDeleted(asset);
    } catch (err) {
      if (err.code === 'NOT_FOUND') onGone(asset);
      else if (err.status !== 401) setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      busy={deleting}
      title="Delete this asset?"
      description={
        <>
          <strong>{asset.item_name}</strong> (<span className="mono">#{asset.id}</span>, room{' '}
          <span className="mono">{asset.room_number}</span>) will be permanently removed from the register. This
          can't be undone.
        </>
      }
    >
      {error && (
        <Alert tone="error" live>
          {error}
        </Alert>
      )}
      {slow && (
        <p className="slow-hint" role="status">
          Still working. Your connection seems slow.
        </p>
      )}
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={deleting} autoFocus>
          Keep asset
        </button>
        <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </Dialog>
  );
}
