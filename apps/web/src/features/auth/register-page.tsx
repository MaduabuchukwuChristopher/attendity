import type { ApiResponse, AuthenticatedUser, UserRole } from '@qr/types';
import { Button, Card, Input, Select } from '@qr/ui';
import { Check, Circle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AuthLayout } from './auth-layout.js';
import { apiErrorMessage, passwordRequirements } from './auth-utils.js';
import {
  assessmentRegistrationEnabled,
  assessmentRoleOptions,
  DEFAULT_INSTITUTION_CODE,
  institutionOptions,
  roleLabel,
} from './auth-options.js';

export default function RegisterPage() {
  const demoRegistration = assessmentRegistrationEnabled();
  const [role, setRole] = useState<UserRole>('student');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<ApiResponse<AuthenticatedUser>>(
        demoRegistration ? '/auth/demo-register' : '/auth/register',
        {
          universityId: data.get('universityId'),
          firstName: data.get('firstName'),
          lastName: data.get('lastName'),
          email: data.get('email'),
          password,
          ...(demoRegistration ? { role } : {}),
        },
      );
      if (response.status >= 200 && response.status < 300) {
        setSuccess(true);
      } else {
        setError(apiErrorMessage(response, 'Your account could not be created.'));
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Your account could not be created.'));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthLayout>
      <p className="auth-form-kicker">
        {demoRegistration ? 'Assessment registration' : 'Student registration'}
      </p>
      <h1 className="auth-form-title">Create your account</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {demoRegistration
          ? 'Choose the university role you want to test. Existing demonstration accounts and their records remain unchanged.'
          : 'Staff accounts are created by invitation from an authorised institution administrator.'}
      </p>
      <Card className="auth-form-card mt-7 p-6 sm:p-7">
        {success ? (
          <div role="status">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-100 text-primary dark:bg-emerald-950">
              <Check aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Check your email</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              We sent a secure verification link. Verify your address before signing in.
            </p>
            <Link
              className="mt-6 inline-block font-semibold text-primary hover:underline"
              to="/login"
            >
              Return to sign in
            </Link>
          </div>
        ) : (
          <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
            <Select
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
            {demoRegistration ? (
              <Select
                label="Account role"
                name="role"
                onChange={(event) => setRole(event.currentTarget.value as UserRole)}
                value={role}
              >
                {assessmentRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <Input autoComplete="given-name" label="First name" name="firstName" required />
              <Input autoComplete="family-name" label="Last name" name="lastName" required />
            </div>
            <Input
              autoComplete="email"
              label="Institution email"
              name="email"
              required
              type="email"
            />
            <Input
              autoComplete="new-password"
              label="Password"
              name="password"
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              type="password"
              value={password}
            />
            <ul
              aria-label="Password requirements"
              className="grid gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
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
              className="auth-submit-button w-full"
              disabled={submitting || !passwordRequirements.every((item) => item.test(password))}
              type="submit"
            >
              {submitting
                ? 'Creating account…'
                : `Create ${demoRegistration ? roleLabel(role) : 'Student'} account`}
            </Button>
          </form>
        )}
      </Card>
      {!success ? (
        <p className="mt-6 text-center text-sm">
          Already registered?{' '}
          <Link className="font-semibold text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}
