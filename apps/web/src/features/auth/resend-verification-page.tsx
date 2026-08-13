import type { ApiResponse } from '@qr/types';
import { Button, Card, Input } from '@qr/ui';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AuthLayout } from './auth-layout.js';
import { apiErrorMessage } from './auth-utils.js';

export default function ResendVerificationPage() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<ApiResponse<null>>('/auth/resend-verification', {
        universityId: data.get('universityId'),
        email: data.get('email'),
      });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'A new verification email could not be requested.'));
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthLayout>
      <p className="text-sm font-semibold text-primary">Email verification</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Request a new link</h1>
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
          <Button disabled={pending} type="submit">
            {pending ? 'Requesting link…' : 'Send verification link'}
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
