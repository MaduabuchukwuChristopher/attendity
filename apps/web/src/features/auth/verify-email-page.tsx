import type { ApiResponse } from '@qr/types';
import { useMutation } from '@tanstack/react-query';
import { Card, Skeleton } from '@qr/ui';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AuthLayout } from './auth-layout.js';
import { apiErrorMessage } from './auth-utils.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const executedTokenRef = useRef<string | null>(null);

  const verification = useMutation({
    mutationFn: (tokenToVerify: string) =>
      apiClient.post<ApiResponse<null>>('/auth/verify-email', { token: tokenToVerify }),
  });

  useEffect(() => {
    if (token && executedTokenRef.current !== token) {
      executedTokenRef.current = token;
      verification.mutate(token);
    }
  }, [token, verification]);

  const isLoading =
    verification.isPending || (!verification.isSuccess && !verification.isError && Boolean(token));

  return (
    <AuthLayout>
      <Card className="p-7 text-center">
        {!token ? (
          <>
            <XCircle className="mx-auto text-danger" size={48} />
            <h1 className="mt-5 text-2xl font-bold">Verification link incomplete</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Open the complete link from your verification email.
            </p>
          </>
        ) : isLoading ? (
          <div aria-busy="true">
            <Skeleton className="mx-auto size-12 rounded-full" />
            <Skeleton className="mx-auto mt-5 h-7 w-52" />
            <Skeleton className="mx-auto mt-4 h-4 w-72 max-w-full" />
          </div>
        ) : verification.isSuccess ? (
          <>
            <CheckCircle2 className="mx-auto text-primary" size={48} />
            <h1 className="mt-5 text-2xl font-bold">Email verified</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Your Attendity account is active and ready.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto text-danger" size={48} />
            <h1 className="mt-5 text-2xl font-bold">Verification failed</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {apiErrorMessage(verification.error, 'This verification link is invalid or expired.')}
            </p>
          </>
        )}
        <Link className="mt-7 inline-block font-semibold text-primary hover:underline" to="/login">
          Continue to sign in
        </Link>
        {verification.isError ? (
          <Link
            className="mt-3 block text-sm font-semibold text-primary hover:underline"
            to="/resend-verification"
          >
            Request a new verification link
          </Link>
        ) : null}
      </Card>
    </AuthLayout>
  );
}
