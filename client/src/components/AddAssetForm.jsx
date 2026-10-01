import { useRef, useState } from 'react';
import Field from './Field.jsx';
import Alert from './Alert.jsx';
import { api } from '../lib/api.js';
import { useSlowFlag } from '../lib/hooks.js';
import { validateAsset } from '../lib/validation.js';

const EMPTY = { item_name: '', category: '', room_number: '' };

export default function AddAssetForm({ categories, rooms, onCreated }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const slow = useSlowFlag(saving);
  const nameRef = useRef(null);

  function update(field) {
    return (event) => {
      const value = event.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    };
  }

  function revalidate(field) {
    return () => {
      if (values[field] === '') return;
      const fieldError = validateAsset(values)[field];
      setErrors((e) => ({ ...e, [field]: fieldError }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const clientErrors = validateAsset(values);
    setErrors(clientErrors);
    const firstInvalid = Object.keys(EMPTY).find((field) => clientErrors[field]);
    if (firstInvalid) {
      event.currentTarget.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSaving(true);
    try {
      const asset = await api.createAsset(values);
      setValues(EMPTY);
      setErrors({});
      onCreated(asset);
      nameRef.current?.focus();
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else if (err.status !== 401) setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card add-form" onSubmit={handleSubmit} noValidate aria-labelledby="add-asset-heading">
      <h2 id="add-asset-heading" className="card__title">
        Add asset
      </h2>
      <Field
        label="Item name"
        name="item_name"
        inputRef={nameRef}
        value={values.item_name}
        onChange={update('item_name')}
        onBlur={revalidate('item_name')}
        error={errors.item_name}
        maxLength={100}
        autoComplete="off"
        placeholder="e.g. Dell Latitude 7440"
        required
      />
      <Field
        label="Category"
        name="category"
        value={values.category}
        onChange={update('category')}
        onBlur={revalidate('category')}
        error={errors.category}
        maxLength={50}
        autoComplete="off"
        list="category-options"
        hint={categories.length ? 'Pick an existing category or type a new one.' : undefined}
        required
      />
      <datalist id="category-options">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Field
        label="Room number"
        name="room_number"
        className="mono-input"
        value={values.room_number}
        onChange={update('room_number')}
        onBlur={revalidate('room_number')}
        error={errors.room_number}
        maxLength={20}
        autoComplete="off"
        list="room-options"
        placeholder="e.g. B-204"
        required
      />
      <datalist id="room-options">
        {rooms.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {formError && (
        <Alert tone="error" live>
          {formError}
        </Alert>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
        {saving ? 'Adding…' : 'Add to register'}
      </button>
      {slow && (
        <p className="slow-hint" role="status">
          Still working. Your connection seems slow.
        </p>
      )}
    </form>
  );
}
