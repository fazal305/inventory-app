import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import Alert from './Alert.jsx';
import Logo from './Logo.jsx';
import { useSlowFlag } from '../lib/hooks.js';

export default function RequireAuth({ children }) {
  const { status, retry } = useAuth();
  const location = useLocation();
  const slow = useSlowFlag(status === 'checking');

  if (status === 'checking') {
    return (
      <div className="boot" role="status">
        <Logo size={40} />
        <p className="boot__text">{slow ? 'Still connecting. The server is slow to respond…' : 'Loading…'}</p>
      </div>
    );
  }

  if (status === 'unreachable') {
    return (
      <main id="main" className="boot">
        <Alert
          tone="error"
          title="Can't reach the server"
          live
          action={
            <button type="button" className="btn btn--secondary btn--sm" onClick={retry}>
              Try again
            </button>
          }
        >
          Check your connection. If it's working, the service may be down. Try again in a moment.
        </Alert>
      </main>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
