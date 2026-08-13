import { buttonClassName, Card } from '@qr/ui';
import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store.js';
import { roleHome } from './auth-utils.js';

export default function AccessDeniedPage() {
  const user = useAuthStore((state) => state.user);
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5 text-slate-950 dark:bg-dark-background dark:text-white">
      <Card className="w-full max-w-lg p-8 text-center">
        <ShieldX className="mx-auto text-primary" size={48} />
        <p className="mt-5 text-sm font-semibold text-primary">Error 403</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Access restricted</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          This workspace is outside the permissions assigned to your institution role.
        </p>
        <Link
          className={buttonClassName('primary', 'mt-7')}
          to={user ? roleHome(user.role) : '/login'}
        >
          Return to your workspace
        </Link>
      </Card>
    </main>
  );
}
