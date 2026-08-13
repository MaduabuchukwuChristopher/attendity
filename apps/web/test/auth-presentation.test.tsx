import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/contexts/theme-context.js';
import { AuthLayout } from '../src/features/auth/auth-layout.js';

describe('AuthLayout presentation', () => {
  it('uses the approved university attendance image and preserves the form landmark', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }));
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AuthLayout>
            <h1>Secure form</h1>
          </AuthLayout>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(
      screen.getByAltText('Student using Attendity at a university lecture theatre'),
    ).toHaveAttribute('src', '/images/attendity-mobile-attendance-premium.png');
    expect(screen.getByText('A trusted academic record starts with secure access.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Secure form' })).toBeVisible();
  });
});
