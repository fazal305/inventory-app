import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from './Toasts.jsx';
import Logo from './Logo.jsx';

export default function AppHeader() {
  const { username, logout } = useAuth();
  const { notify } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      notify('You were signed out on this device, but the server could not be reached to end the session.', 'error');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="brand" aria-label="Asset Register home">
          <Logo />
          <span className="brand__name">Asset Register</span>
        </Link>
        {username && (
          <nav className="app-header__nav" aria-label="Main">
            <Link to="/">Room register</Link>
            <Link to="/assets">Asset management</Link>
          </nav>
        )}
        {username && (
          <div className="app-header__user">
            <span className="app-header__who">
              <span className="visually-hidden">Signed in as </span>
              <span className="mono">{username}</span>
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
