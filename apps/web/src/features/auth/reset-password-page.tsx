import type { ApiResponse } from '@qr/types';
import { Button, Card, Input } from '@qr/ui';
import { Check, Circle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AuthLayout } from './auth-layout.js';
import { apiErrorMessage, passwordRequirements } from './auth-utils.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? '' : 'This password reset link is incomplete.');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await apiClient.post<ApiResponse<null>>('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'The password could not be reset.'));
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthLayout>
      <p className="text-sm font-semibold text-primary">Secure password reset</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose a new password</h1>
      <Card className="mt-7 p-6 sm:p-7">
        {success ? (
          <div role="status">
            <h2 className="text-xl font-bold">Password updated</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              All existing device sessions have been signed out.
            </p>
            <Link
              className="mt-6 inline-block font-semibold text-primary hover:underline"
              to="/login"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
            <Input
              autoComplete="new-password"
              label="New password"
              name="password"
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              type="password"
              value={password}
            />
            <ul className="grid gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              {passwordRequirements.map((requirement) => {
                const met = requirement.test(password);
                return (
                  <li className="flex items-center gap-2" key={requirement.label}>
                    {met ? <Check className="text-primary" size={14} /> : <Circle size={10} />}
                    {requirement.label}
                  </li>
                );
              })}
            </ul>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={
                !token || pending || !passwordRequirements.every((item) => item.test(password))
              }
              type="submit"
            >
              {pending ? 'Updating password…' : 'Update password'}
            </Button>
          </form>
        )}
      </Card>
    </AuthLayout>
  );
}
