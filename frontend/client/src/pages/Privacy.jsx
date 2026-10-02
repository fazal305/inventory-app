import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/hooks.js';

export default function Privacy() {
  useDocumentTitle('Privacy & cookies');
  const { status } = useAuth();
  return (
    <>
      <main id="main" className="simple-page prose">
        <Link to={status === 'authenticated' ? '/' : '/login'} className="back-link">
          ← Back
        </Link>
        <h1>Privacy &amp; cookies</h1>
        <p>
          Asset Register is an internal tool for tracking office hardware. This page explains what it stores and why.
        </p>

        <h2>What is stored about you</h2>
        <ul>
          <li>
            <strong>Your staff account:</strong> a username and a one-way password hash. The password itself is never
            stored and can't be read back by anyone.
          </li>
          <li>
            <strong>Security logs:</strong> sign-in attempts are counted by IP address and username to block password
            guessing. These records are deleted automatically within a day.
          </li>
        </ul>
        <p>Asset records describe equipment and rooms, not people.</p>

        <h2>Cookies and local storage</h2>
        <ul>
          <li>
            <strong>
              <code>staff_sid</code> (strictly necessary):
            </strong>{' '}
            a session cookie that keeps you signed in. It can't be read by page scripts, is deleted when you sign out
            or close the browser, and expires after a period of inactivity.
          </li>
          <li>
            <strong>Remembered username (optional):</strong> if you tick “Remember my username”, it is saved in this
            browser's local storage so the sign-in form is pre-filled next time. Untick the box when you next sign in
            to remove it.
          </li>
        </ul>
        <p>
          There are no analytics, advertising or third-party trackers, and fonts are served from this site, so no
          consent banner is needed.
        </p>

        <h2>Questions</h2>
        <p>Contact your IT administrator about your account or to have it removed.</p>
      </main>
      <SiteFooter />
    </>
  );
}
