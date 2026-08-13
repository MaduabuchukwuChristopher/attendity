import { useEffect, useState } from 'react';

export function ConnectivityStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleUpdate = () => setUpdateReady(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('attendity:update-ready', handleUpdate);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('attendity:update-ready', handleUpdate);
    };
  }, []);

  if (online && !updateReady) return null;
  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-950 px-4 py-3 text-sm text-white shadow-xl"
      role="status"
    >
      <span>
        {updateReady
          ? 'A secure Attendity update is ready.'
          : 'You are offline. Saved screens remain available; new attendance actions require a connection.'}
      </span>
      {updateReady ? (
        <button
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={() => window.location.reload()}
          type="button"
        >
          Update
        </button>
      ) : null}
    </div>
  );
}
