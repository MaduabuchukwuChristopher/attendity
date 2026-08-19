import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/contexts/theme-context.js';
import LoginPage from '../src/features/auth/login-page.js';
import RegisterPage from '../src/features/auth/register-page.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('assessment registration journey', () => {
  it('preselects Lagos Metropolitan University on sign in', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole('combobox', { name: 'Institution code' })).toHaveValue(
      'lagos-metropolitan-university',
    );
  });

  it('offers the four approved tester roles when assessment registration is enabled', async () => {
    vi.stubEnv('VITE_ALLOW_DEMO_ROLE_REGISTRATION', 'true');

    render(
      <ThemeProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole('combobox', { name: 'Account role' })).toHaveValue('student');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(
      expect.arrayContaining(['Institution Admin', 'Lecturer', 'Examiner', 'Student']),
    );
  });
});
