import { buttonClassName, Card } from '@qr/ui';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5 text-slate-950 dark:bg-dark-background dark:text-white">
      <Card className="w-full max-w-lg p-8 text-center">
        <p className="text-sm font-semibold text-primary">Error 404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          The address may be incorrect or the page may have moved.
        </p>
        <Link className={buttonClassName('primary', 'mt-7')} to="/">
          Return to Attendity
        </Link>
      </Card>
    </main>
  );
}
