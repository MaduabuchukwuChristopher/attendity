import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmailPage from '../src/features/auth/verify-email-page.js';
import { apiClient } from '../src/api/client.js';
import { ThemeProvider } from '../src/contexts/theme-context.js';

describe('VerifyEmailPage', () => {
  it('renders incomplete link message when token query param is missing', () => {
    const queryClient = new QueryClient();
    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/verify-email']}>
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText('Verification link incomplete')).toBeVisible();
  });

  it('triggers verification API exactly once per token on mount', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { success: true, message: 'Email verified', data: null, timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter
            initialEntries={['/verify-email?token=valid-test-token-123456789012345678901234567890']}
          >
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Email verified')).toBeVisible();
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/auth/verify-email', {
      token: 'valid-test-token-123456789012345678901234567890',
    });

    postSpy.mockRestore();
  });
});
