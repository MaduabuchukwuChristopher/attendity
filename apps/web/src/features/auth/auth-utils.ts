import type { UserRole } from '@qr/types';

export function roleHome(role: UserRole): string {
  if (role === 'lecturer') return '/app/lecturer';
  if (role === 'student') return '/app/student';
  if (role === 'examiner') return '/app/examiner';
  return '/app';
}

function readMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const value = payload.trim();
    return value.length > 0 ? value : null;
  }
  if (payload && typeof payload === 'object') {
    const record = payload as { message?: unknown; error?: { message?: unknown } };
    if (typeof record.message === 'string' && record.message.trim().length > 0)
      return record.message;
    if (
      record.error &&
      typeof record.error.message === 'string' &&
      record.error.message.trim().length > 0
    )
      return record.error.message;
  }
  return null;
}

function readErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as {
    response?: { data?: unknown };
    message?: unknown;
    error?: { message?: unknown };
  };

  const fromResponse = readMessage(record.response?.data);
  if (fromResponse) return fromResponse;

  const fromError = readMessage(record.error);
  if (fromError) return fromError;

  if (typeof record.message === 'string') {
    const message = record.message.trim();
    if (message.length > 0 && !message.startsWith('Request failed with status code'))
      return message;
  }

  return null;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return readErrorMessage(error) ?? fallback;
}

export const passwordRequirements = [
  { label: '12 or more characters', test: (value: string) => value.length >= 12 },
  {
    label: 'Uppercase and lowercase letters',
    test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value),
  },
  {
    label: 'A number and a symbol',
    test: (value: string) => /\d/.test(value) && /[^A-Za-z0-9]/.test(value),
  },
] as const;
