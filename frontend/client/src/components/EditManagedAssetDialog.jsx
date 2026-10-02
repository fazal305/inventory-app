import { useState } from 'react';
import Dialog from './Dialog.jsx';
import Field from './Field.jsx';
import Alert from './Alert.jsx';
import { backendApi } from '../lib/backendApi.js';
import { useSlowFlag } from '../lib/hooks.js';
import { ASSET_STATUSES, ASSET_STATUS_LABELS } from '../lib/assetStatus.js';

/** Simple edit form for an asset's status and assignment — the two fields that matter day to day. */
export default function EditManagedAssetDialog({ asset, onClose, onSaved, onGone }) {
  const [status, setStatus] = useState(asset.status);
  const [assignedTo, setAssignedTo] = useState(asset.assigned_to ?? '');
  const [location, setLocation] = useState(asset.location ?? '');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const slow = useSlowFlag(saving);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const updated = await backendApi.updateAsset(asset.id, {
        status,
        assigned_to: assignedTo.trim() === '' ? null : assignedTo.trim(),
        location: location.trim() === '' ? null : location.trim(),
      });
      onSaved(updated);
    } catch (err) {
      if (err.code === 'NOT_FOUND') onGone(asset);
      else setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      busy={saving}
      title="Update asset"
      description={
        <>
          <span className="mono">{asset.asset_tag}</span> — {asset.name}
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="dialog__form">
        <div className="field">
          <label htmlFor="edit-asset-status" className="field__label">
            Status
          </label>
          <select
            id="edit-asset-status"
            className="field__input select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            autoFocus
          >
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ASSET_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Assigned to"
          name="assigned_to"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Person, department, or blank for unassigned"
          maxLength={150}
          autoComplete="off"
        />
        <Field
          label="Location"
          name="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. HQ - 3rd Floor"
          maxLength={150}
          autoComplete="off"
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
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
