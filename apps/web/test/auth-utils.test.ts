import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from '../src/features/auth/auth-utils.js';

describe('apiErrorMessage', () => {
  it('returns the server message when the axios payload is a plain string', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: 'An account with this email already exists.',
      },
    };

    expect(apiErrorMessage(error, 'Your account could not be created.')).toBe(
      'An account with this email already exists.',
    );
  });

  it('returns the server message when the axios payload is an object with a message field', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: { message: 'Institution account was not found.' },
      },
    };

    expect(apiErrorMessage(error, 'Your account could not be created.')).toBe(
      'Institution account was not found.',
    );
  });
});
