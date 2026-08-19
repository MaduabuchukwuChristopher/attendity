import { BrandMark } from '@qr/ui';
import { Check, Moon, ShieldCheck, Sun } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/theme-context.js';

export function AuthLayout({ children }: PropsWithChildren) {
  const { preference, setPreference } = useTheme();
  const toggleTheme = () => setPreference(preference === 'dark' ? 'light' : 'dark');
  return (
    <main className="auth-shell grid min-h-screen max-w-full overflow-x-clip bg-background text-slate-950 dark:bg-dark-background dark:text-white lg:grid-cols-[minmax(24rem,0.94fr)_1.06fr]">
      <a className="skip-link" href="#auth-content">
        Skip to form
      </a>
      <nav
        aria-label="Authentication navigation"
        className="sticky top-0 z-40 flex min-h-16 w-full items-center justify-between border-b border-academic-gold/45 bg-university-navy px-4 text-white shadow-lg shadow-slate-950/15 lg:hidden"
      >
        <Link aria-label="Attendity sign in" to="/login">
          <BrandMark inverse />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden truncate text-xs font-bold uppercase tracking-[0.12em] text-emerald-100 min-[390px]:block">
            University portal
          </span>
          <button
            aria-label="Toggle theme"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-academic-gold transition hover:bg-white/15"
            onClick={toggleTheme}
            type="button"
          >
            {preference === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>
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
          className="auth-theme-toggle absolute right-5 top-5 hidden size-11 place-items-center rounded-xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-dark-surface lg:grid"
          onClick={toggleTheme}
          type="button"
        >
          {preference === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="auth-form-reveal auth-form-container min-w-0 w-full max-w-md">
          {children}
          <p className="mt-7 text-center text-xs text-slate-600 dark:text-slate-300">
            Secure access for authorised institution users only.
          </p>
        </div>
      </section>
    </main>
  );
}
