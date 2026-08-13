import { useEffect, type PropsWithChildren } from 'react';
import { refreshSession } from '../api/client.js';
import { useAuthStore } from '../store/auth-store.js';

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  useEffect(() => {
    if (status !== 'checking') return;
    void refreshSession().catch(() => undefined);
  }, [status]);
  return children;
}
