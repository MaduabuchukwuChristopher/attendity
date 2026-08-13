import type { ApiResponse } from '@qr/types';
import { Button, Card, ErrorState, Input, Skeleton } from '@qr/ui';
import { Check, Circle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AuthLayout } from './auth-layout.js';
import { apiErrorMessage, passwordRequirements } from './auth-utils.js';

interface InvitationDetails {
  readonly email: string;
  readonly role: string;
  readonly institutionName: string;
  readonly expiresAt: string;
}

export default function AcceptInvitationPage() {
  const [search] = useSearchParams();
  const token = search.get('token') ?? '';
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void apiClient
      .get<ApiResponse<InvitationDetails>>(`/auth/invitations/${token}`)
      .then((response) => setDetails(response.data.data))
      .catch((requestError) =>
        setError(apiErrorMessage(requestError, 'This invitation is unavailable.')),
      )
      .finally(() => setLoading(false));
  }, [token]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await apiClient.post('/auth/invitations/accept', {
        token,
        firstName: data.get('firstName'),
        lastName: data.get('lastName'),
        password,
      });
      setSuccess(true);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Your staff account could not be created.'));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthLayout>
      <p className="auth-form-kicker">Secure staff invitation</p>
      <h1 className="auth-form-title">Join your institution</h1>
      {loading ? (
        <Skeleton className="mt-7 h-80" />
      ) : !details && !success ? (
        <div className="mt-7">
          <ErrorState
            title="Invitation unavailable"
            description={error || 'The link is missing, expired, or already used.'}
          />
        </div>
      ) : (
        <Card className="auth-form-card mt-7 p-6 sm:p-7">
          {success ? (
            <div role="status">
              <Check className="text-primary" size={40} />
              <h2 className="mt-4 text-xl font-bold">Account ready</h2>
              <p className="mt-2 text-sm">
                Your staff role is active. The same Attendity sign-in automatically opens the
                correct dashboard.
              </p>
              <Link className="mt-5 inline-block font-semibold text-primary" to="/login">
                Continue to sign in
              </Link>
            </div>
          ) : (
            <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
              <div className="rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-950">
                <strong>{details?.institutionName}</strong>
                <br />
                {details?.email} · {details?.role.replaceAll('_', ' ')}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="First name" name="firstName" required />
                <Input label="Last name" name="lastName" required />
              </div>
              <Input
                label="Create password"
                name="password"
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
                type="password"
                value={password}
              />
              <ul aria-label="Password requirements" className="grid gap-1 text-xs">
                {passwordRequirements.map((item) => (
                  <li className="flex items-center gap-2" key={item.label}>
                    {item.test(password) ? (
                      <Check size={14} className="text-primary" />
                    ) : (
                      <Circle size={9} />
                    )}
                    {item.label}
                  </li>
                ))}
              </ul>
              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                disabled={submitting || !passwordRequirements.every((item) => item.test(password))}
                type="submit"
              >
                {submitting ? 'Creating account…' : 'Accept invitation'}
              </Button>
            </form>
          )}
        </Card>
      )}
    </AuthLayout>
  );
}
