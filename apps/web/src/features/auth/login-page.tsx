import type { ApiResponse, AuthenticatedUser } from '@qr/types';
import { Button, Card, Input, Select } from '@qr/ui';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { useAuthStore } from '../../store/auth-store.js';
import { AuthLayout } from './auth-layout.js';
import { apiErrorMessage, roleHome } from './auth-utils.js';
import { DEFAULT_INSTITUTION_CODE, institutionOptions } from './auth-options.js';

interface SessionPayload {
  readonly user: AuthenticatedUser;
  readonly accessToken: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = Boolean((location.state as { expired?: boolean } | null)?.expired);
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<ApiResponse<SessionPayload>>('/auth/login', {
        universityId: data.get('universityId'),
        email: data.get('email'),
        password: data.get('password'),
        rememberMe: data.get('rememberMe') === 'on',
      });
      setSession(response.data.data.user, response.data.data.accessToken);
      void navigate(roleHome(response.data.data.user.role), { replace: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Sign-in failed. Check your details and try again.'));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthLayout>
      <p className="auth-form-kicker">University portal</p>
      <h1 className="auth-form-title">Welcome back</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Students, lecturers, examiners, and administrators use this single secure sign-in. Attendity
        opens the dashboard assigned to your verified role automatically.
      </p>
      <Card className="auth-form-card mt-7 p-6 sm:p-7">
        {sessionExpired ? (
          <p
            className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            role="status"
          >
            Your session expired. Sign in again to continue securely.
          </p>
        ) : null}
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <Select
            autoComplete="organization"
            defaultValue={DEFAULT_INSTITUTION_CODE}
            label="Institution code"
            name="universityId"
            required
          >
            {institutionOptions.map((institution) => (
              <option key={institution.value} value={institution.value}>
                {institution.label}
              </option>
            ))}
          </Select>
          <Input autoComplete="email" label="Email address" name="email" required type="email" />
          <div className="relative">
            <Input
              autoComplete="current-password"
              className="pr-12"
              label="Password"
              name="password"
              required
              type={showPassword ? 'text' : 'password'}
            />
            <button
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute bottom-0 right-0 grid size-11 place-items-center text-slate-500"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input className="size-4 accent-primary" name="rememberMe" type="checkbox" />
              Remember this device
            </label>
            <Link className="font-semibold text-primary hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          {error ? (
            <div
              className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
              role="alert"
            >
              <p>{error}</p>
              {error.toLowerCase().includes('verifi') ? (
                <Link
                  className="mt-2 block font-semibold text-primary hover:underline"
                  to="/resend-verification"
                >
                  Resend verification email
                </Link>
              ) : null}
            </div>
          ) : null}
          <Button className="auth-submit-button w-full gap-2" disabled={submitting} type="submit">
            <LockKeyhole size={17} /> {submitting ? 'Signing in…' : 'Sign in securely'}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        New student?{' '}
        <Link className="font-semibold text-primary hover:underline" to="/register">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
