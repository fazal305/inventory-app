import { useState } from 'react';
import Field from './Field.jsx';
import Alert from './Alert.jsx';
import { backendApi } from '../lib/backendApi.js';
import { useSlowFlag } from '../lib/hooks.js';

/**
 * backend/ (the merged inventory-api) has its own bearer-token auth, separate
 * from this app's own session-cookie sign-in — so reaching the asset
 * management page needs its own small login step the first time.
 */
export default function BackendLoginPanel({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const slow = useSlowFlag(signingIn);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSigningIn(true);
    try {
      await backendApi.login(email, password);
      onSignedIn();
    } catch (err) {
      setError(err.details?.password ?? err.details?.email ?? err.message);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <form className="card add-form" onSubmit={handleSubmit} noValidate aria-labelledby="backend-login-heading">
      <h2 id="backend-login-heading" className="card__title">
        Sign in to the backend API
      </h2>
      <p className="page__lede">
        Asset management is served by <span className="mono">backend/</span>, which has its own account system. Sign
        in with a backend user (created via <span className="mono">POST /api/v1/auth/register</span>) to continue.
      </p>
      <Field
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
        autoFocus
      />
      <Field
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error && (
        <Alert tone="error" live>
          {error}
        </Alert>
      )}
      <button type="submit" className="btn btn--primary btn--block" disabled={signingIn}>
        {signingIn ? 'Signing in…' : 'Sign in'}
      </button>
      {slow && (
        <p className="slow-hint" role="status">
          Still working. Your connection seems slow.
        </p>
      )}
    </form>
  );
}
