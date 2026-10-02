import { useRef, useState } from 'react';
import Field from './Field.jsx';
import Alert from './Alert.jsx';
import { backendApi } from '../lib/backendApi.js';
import { useSlowFlag } from '../lib/hooks.js';
import { ASSET_STATUSES, ASSET_STATUS_LABELS } from '../lib/assetStatus.js';

const EMPTY = {
  asset_tag: '',
  name: '',
  status: 'in_storage',
  serial_number: '',
  assigned_to: '',
  location: '',
  purchase_date: '',
  purchase_cost: '',
  warranty_expires_at: '',
  notes: '',
};

export default function AddManagedAssetForm({ onCreated, autoFocus = false }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const slow = useSlowFlag(saving);
  const tagRef = useRef(null);

  function update(field) {
    return (event) => {
      const value = event.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const payload = {
      asset_tag: values.asset_tag.trim(),
      name: values.name.trim(),
      status: values.status,
      serial_number: values.serial_number.trim() || null,
      assigned_to: values.assigned_to.trim() || null,
      location: values.location.trim() || null,
      purchase_date: values.purchase_date || null,
      purchase_cost: values.purchase_cost === '' ? null : values.purchase_cost,
      warranty_expires_at: values.warranty_expires_at || null,
      notes: values.notes.trim() || null,
    };

    setSaving(true);
    try {
      const asset = await backendApi.createAsset(payload);
      setValues(EMPTY);
      setErrors({});
      onCreated(asset);
      tagRef.current?.focus();
    } catch (err) {
      if (err.details) setErrors(err.details);
      else setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card add-form" onSubmit={handleSubmit} noValidate aria-labelledby="add-managed-asset-heading">
      <h2 id="add-managed-asset-heading" className="card__title">
        Add asset
      </h2>
      <Field
        label="Asset tag"
        name="asset_tag"
        inputRef={tagRef}
        autoFocus={autoFocus}
        className="mono-input"
        value={values.asset_tag}
        onChange={update('asset_tag')}
        error={errors.asset_tag}
        maxLength={50}
        autoComplete="off"
        placeholder="e.g. AST-1006"
        required
      />
      <Field
        label="Name"
        name="name"
        value={values.name}
        onChange={update('name')}
        error={errors.name}
        maxLength={150}
        autoComplete="off"
        placeholder="e.g. Dell Latitude 5440 Laptop"
        required
      />
      <div className="field">
        <label htmlFor="add-asset-status" className="field__label">
          Status
        </label>
        <select id="add-asset-status" className="field__input select" value={values.status} onChange={update('status')}>
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ASSET_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <Field
        label="Serial number"
        name="serial_number"
        className="mono-input"
        value={values.serial_number}
        onChange={update('serial_number')}
        error={errors.serial_number}
        maxLength={100}
        autoComplete="off"
      />
      <Field
        label="Assigned to"
        name="assigned_to"
        value={values.assigned_to}
        onChange={update('assigned_to')}
        error={errors.assigned_to}
        maxLength={150}
        autoComplete="off"
        placeholder="Person, department, or leave blank"
      />
      <Field
        label="Location"
        name="location"
        value={values.location}
        onChange={update('location')}
        error={errors.location}
        maxLength={150}
        autoComplete="off"
      />
      <Field
        label="Purchase date"
        name="purchase_date"
        type="date"
        value={values.purchase_date}
        onChange={update('purchase_date')}
        error={errors.purchase_date}
      />
      <Field
        label="Purchase cost"
        name="purchase_cost"
        type="number"
        min="0"
        step="0.01"
        value={values.purchase_cost}
        onChange={update('purchase_cost')}
        error={errors.purchase_cost}
      />
      <Field
        label="Warranty expires"
        name="warranty_expires_at"
        type="date"
        value={values.warranty_expires_at}
        onChange={update('warranty_expires_at')}
        error={errors.warranty_expires_at}
      />

      {formError && (
        <Alert tone="error" live>
          {formError}
        </Alert>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
        {saving ? 'Adding…' : 'Add asset'}
      </button>
      {slow && (
        <p className="slow-hint" role="status">
          Still working. Your connection seems slow.
        </p>
      )}
    </form>
  );
}
