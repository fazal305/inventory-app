import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <OfflineBanner />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
