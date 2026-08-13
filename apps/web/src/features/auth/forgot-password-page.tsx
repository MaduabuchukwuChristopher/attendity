import type { ApiResponse } from '@qr/types';
import { Button, Card, Input } from '@qr/ui';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AuthLayout } from './auth-layout.js';
import { apiErrorMessage } from './auth-utils.js';

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', {
        universityId: data.get('universityId'),
        email: data.get('email'),
      });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'We could not process the request.'));
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthLayout>
      <p className="text-sm font-semibold text-primary">Account recovery</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Enter your institution and verified email. For security, the response will not reveal
        whether an account exists.
      </p>
      <Card className="mt-7 p-6 sm:p-7">
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <Input label="Institution code" name="universityId" required />
          <Input autoComplete="email" label="Email address" name="email" required type="email" />
          {message ? (
            <p
              className="rounded-xl bg-emerald-50 p-3 text-sm text-primary dark:bg-emerald-950"
              role="status"
            >
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? 'Sending instructions…' : 'Send reset instructions'}
          </Button>
        </form>
      </Card>
      <Link
        className="mt-6 block text-center text-sm font-semibold text-primary hover:underline"
        to="/login"
      >
        Return to sign in
      </Link>
    </AuthLayout>
  );
}
