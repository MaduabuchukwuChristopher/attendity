import { buttonClassName } from '@qr/ui';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../layouts/landing-layout.js';
export function NotFoundPage() {
  return (
    <LandingLayout>
      <main className="mx-auto grid min-h-100 max-w-7xl place-items-center px-5 text-center">
        <div>
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-3 text-4xl font-bold">This page is not available.</h1>
          <p className="mt-3 text-slate-600">
            Return to the Attendity overview to continue exploring.
          </p>
          <Link className={buttonClassName('primary', 'mt-7')} to="/">
            Go home
          </Link>
        </div>
      </main>
    </LandingLayout>
  );
}
