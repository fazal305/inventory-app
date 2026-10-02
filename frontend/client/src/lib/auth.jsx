import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setCsrfToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // status: 'checking' | 'authenticated' | 'anonymous' | 'unreachable'
  const [status, setStatus] = useState('checking');
  const [username, setUsername] = useState(null);
  const [lostReason, setLostReason] = useState(null);

  const checkSession = useCallback(async () => {
    setStatus('checking');
    try {
      const session = await api.session();
      setCsrfToken(session.csrf_token);
      setUsername(session.username);
      setStatus('authenticated');
    } catch (err) {
      setCsrfToken(null);
      setUsername(null);
      setStatus(err.status === 401 ? 'anonymous' : 'unreachable');
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    function onAuthLost(event) {
      setCsrfToken(null);
      setUsername(null);
      setLostReason(event.detail?.code === 'SESSION_EXPIRED' ? 'expired' : 'signed-out');
      setStatus('anonymous');
    }
    window.addEventListener('auth:lost', onAuthLost);
    return () => window.removeEventListener('auth:lost', onAuthLost);
  }, []);

  const login = useCallback(async (user, password) => {
    const session = await api.login(user, password);
    setCsrfToken(session.csrf_token);
    setUsername(session.username);
    setLostReason(null);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // Even if the request fails, drop local auth state so the UI never shows stale access.
      setCsrfToken(null);
      setUsername(null);
      setLostReason(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ status, username, lostReason, login, logout, retry: checkSession }),
    [status, username, lostReason, login, logout, checkSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
