import { useOnlineStatus } from '../lib/hooks.js';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      You're offline. Changes can't be saved until your connection returns.
    </div>
  );
}
