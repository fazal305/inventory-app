import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/hooks.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { status } = useAuth();
  return (
    <>
      <main id="main" className="simple-page simple-page--center">
        <Logo size={40} />
        <p className="simple-page__code mono">404</p>
        <h1 className="simple-page__title">This page isn't in the register</h1>
        <p className="simple-page__text">The address may be mistyped, or the page may have moved.</p>
        <Link to={status === 'authenticated' ? '/' : '/login'} className="btn btn--primary">
          {status === 'authenticated' ? 'Back to the dashboard' : 'Go to sign in'}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
