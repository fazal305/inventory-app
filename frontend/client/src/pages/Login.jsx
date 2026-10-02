import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Field from '../components/Field.jsx';
import Alert from '../components/Alert.jsx';
import Logo from '../components/Logo.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle, useOnlineStatus, useSlowFlag } from '../lib/hooks.js';
import { getRememberedUsername, setRememberedUsername } from '../lib/rememberedUsername.js';

function describeRetry(seconds) {
  if (!seconds) return 'a few minutes';
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? 'about a minute' : `about ${minutes} minutes`;
}

export default function Login() {
  useDocumentTitle('Sign in');
  const { status, login, lostReason } = useAuth();
  const location = useLocation();
  const online = useOnlineStatus();

  const remembered = getRememberedUsername();
  const [username, setUsername] = useState(remembered);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(remembered !== '');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const slow = useSlowFlag(submitting);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    (remembered ? passwordRef : usernameRef).current?.focus();
    // Only on first render: later re-renders must not steal focus.
  }, []);

  if (status === 'authenticated') {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const nextErrors = {};
    if (!username.trim()) nextErrors.username = 'Enter your username.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (nextErrors.username) return usernameRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      setRememberedUsername(remember ? username.trim() : '');
    } catch (err) {
      setPassword('');
      if (err.code === 'RATE_LIMITED') {
        setFormError({
          title: 'Too many sign-in attempts',
          text: `For security, sign-in is paused. Try again in ${describeRetry(err.retryAfter)}.`,
        });
      } else if (err.code === 'INVALID_CREDENTIALS') {
        setFormError({ title: "That didn't work", text: 'The username or password is incorrect.' });
        passwordRef.current?.focus();
      } else if (err.fields) {
        setErrors(err.fields);
      } else {
        setFormError({ title: "Couldn't sign in", text: err.message });
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <main id="main" className="login">
        <div className="login__panel">
          <div className="login__brand">
            <Logo size={36} />
            <div>
              <p className="login__product">Asset Register</p>
              <p className="login__tagline">Staff hardware tracking</p>
            </div>
          </div>

          <h1 className="login__title">Sign in</h1>
          <p className="login__lede">Use the staff account issued by your IT administrator.</p>

          {lostReason === 'expired' && !formError && (
            <Alert tone="warning" title="Your session expired">
              You were signed out after a period of inactivity. Sign in again to continue.
            </Alert>
          )}
          {lostReason === 'signed-out' && !formError && (
            <Alert tone="info" title="You've been signed out">
              Sign in again to continue where you left off.
            </Alert>
          )}
          {!online && (
            <Alert tone="warning" title="You're offline">
              Signing in needs a connection. We'll be ready when you're back online.
            </Alert>
          )}
          {formError && (
            <Alert tone="error" title={formError.title} live>
              {formError.text}
            </Alert>
          )}

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <Field
              label="Username"
              name="username"
              inputRef={usernameRef}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username) setErrors((x) => ({ ...x, username: undefined }));
              }}
              error={errors.username}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={50}
              required
            />
            <div className="password-field">
              <Field
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                inputRef={passwordRef}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
                }}
                error={errors.password}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                Remember my username
                <span className="checkbox__hint">Saved on this device only. Your password is never stored.</span>
              </span>
            </label>

            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            {slow && (
              <p className="slow-hint" role="status">
                Still working. The server is taking longer than usual.
              </p>
            )}
          </form>
          <p className="login__help">Forgot your password? Contact your IT administrator to reset it.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
