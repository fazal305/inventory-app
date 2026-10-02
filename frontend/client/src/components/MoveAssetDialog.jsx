import { useState } from 'react';
import Dialog from './Dialog.jsx';
import Field from './Field.jsx';
import Alert from './Alert.jsx';
import { api } from '../lib/api.js';
import { useSlowFlag } from '../lib/hooks.js';
import { validateRoom } from '../lib/validation.js';

export default function MoveAssetDialog({ asset, onClose, onMoved, onGone }) {
  const [room, setRoom] = useState(asset.room_number);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const slow = useSlowFlag(saving);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const fieldError = validateRoom(room);
    if (!fieldError && room.trim() === asset.room_number) {
      setError('This asset is already in that room.');
      return;
    }
    setError(fieldError ?? null);
    if (fieldError) return;

    setSaving(true);
    try {
      const updated = await api.moveAsset(asset.id, room);
      onMoved(updated);
    } catch (err) {
      if (err.code === 'NOT_FOUND') onGone(asset);
      else if (err.fields?.room_number) setError(err.fields.room_number);
      else if (err.status !== 401) setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      busy={saving}
      title="Move asset"
      description={
        <>
          <strong>{asset.item_name}</strong> is currently in room <span className="mono">{asset.room_number}</span>.
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="dialog__form">
        <Field
          label="New room number"
          name="room_number"
          className="mono-input"
          value={room}
          onChange={(e) => {
            setRoom(e.target.value);
            setError(null);
          }}
          error={error}
          maxLength={20}
          autoComplete="off"
          list="room-options"
          autoFocus
          onFocus={(e) => e.target.select()}
          required
        />
        {formError && (
          <Alert tone="error" live>
            {formError}
          </Alert>
        )}
        {slow && (
          <p className="slow-hint" role="status">
            Still working. Your connection seems slow.
          </p>
        )}
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Move asset'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
