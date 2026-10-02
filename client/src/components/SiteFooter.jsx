import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span>Asset Register · internal staff tool</span>
        <Link to="/privacy">Privacy &amp; cookies</Link>
      </div>
    </footer>
  );
}
