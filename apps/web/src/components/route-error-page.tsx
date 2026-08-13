import { Button, buttonClassName, Card } from '@qr/ui';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

export function RouteErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const title = status === 404 ? 'Page not found' : 'Attendity could not open this page';
  const message =
    status === 404
      ? 'The address may have changed, or you may not have access to this workspace.'
      : 'Your data is safe. Retry the page, or return to your workspace.';
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5 text-slate-900 dark:bg-dark-background dark:text-white">
      <Card className="w-full max-w-lg p-8 text-center">
        <p className="text-sm font-semibold text-primary">Error {status}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Link className={buttonClassName('secondary')} to="/app">
            Return to workspace
          </Link>
        </div>
      </Card>
    </main>
  );
}
