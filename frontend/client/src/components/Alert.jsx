const ICONS = {
  error: 'M12 8v5m0 3h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  warning: 'M12 8v5m0 3h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  success: 'm8 12.5 2.5 2.5L16 9.5M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
};

export default function Alert({ tone = 'info', title, children, action, live = false }) {
  const role = live ? (tone === 'error' ? 'alert' : 'status') : undefined;
  return (
    <div className={`alert alert--${tone}`} role={role}>
      <svg className="alert__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d={ICONS[tone]} />
      </svg>
      <div className="alert__body">
        {title && <p className="alert__title">{title}</p>}
        {children && <div className="alert__text">{children}</div>}
      </div>
      {action && <div className="alert__action">{action}</div>}
    </div>
  );
}
