import { BrandMark } from '@qr/ui';
import { Check, Moon, ShieldCheck, Sun } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/theme-context.js';

export function AuthLayout({ children }: PropsWithChildren) {
  const { preference, setPreference } = useTheme();
  return (
    <main className="auth-shell grid min-h-screen bg-background text-slate-950 dark:bg-dark-background dark:text-white lg:grid-cols-[minmax(24rem,0.94fr)_1.06fr]">
      <a className="skip-link" href="#auth-content">
        Skip to form
      </a>
      <section className="auth-story-panel">
        <img
          alt="Student using Attendity at a university lecture theatre"
          className="auth-story-image"
          src="/images/attendity-mobile-attendance-premium.png"
        />
        <div className="auth-story-shade" aria-hidden="true" />
        <div className="auth-story-content">
          <Link aria-label="Attendity sign in" to="/login">
            <BrandMark inverse />
          </Link>
          <div className="auth-story-reveal">
            <span className="auth-trust-mark">
              <ShieldCheck size={19} /> University attendance, secured
            </span>
            <h1>A trusted academic record starts with secure access.</h1>
            <p>
              Attendity connects lecture attendance, academic insight, and verifiable examination
              clearance in one focused university workspace.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                'Short-lived QR codes',
                'Tenant-secure records',
                'Role-aware access',
                'Live academic insight',
              ].map((item) => (
                <span className="auth-benefit" key={item}>
                  <Check size={14} strokeWidth={3} />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <blockquote>
            “Secure access protects the record; consistent presence creates the possibility.”
            <span>Attendity academic principle</span>
          </blockquote>
        </div>
      </section>
      <section
        className="auth-form-panel relative grid place-items-center px-5 py-12 sm:px-8"
        id="auth-content"
      >
        <button
          aria-label="Toggle theme"
          className="auth-theme-toggle absolute right-5 top-5 grid size-11 place-items-center rounded-xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-dark-surface"
          onClick={() => setPreference(preference === 'dark' ? 'light' : 'dark')}
          type="button"
        >
          {preference === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="auth-form-reveal auth-form-container w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          {children}
          <p className="mt-7 text-center text-xs text-slate-600 dark:text-slate-300">
            Secure access for authorised institution users only.
          </p>
        </div>
      </section>
    </main>
  );
}
