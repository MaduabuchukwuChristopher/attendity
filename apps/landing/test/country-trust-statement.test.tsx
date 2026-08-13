import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CountryTrustStatement } from '../src/components/country-trust-statement.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CountryTrustStatement', () => {
  it('keeps a useful global message when detection is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<CountryTrustStatement />);

    expect(
      screen.getByText(/trusted attendance infrastructure for institutions of higher learning/i),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  });

  it('supports a privacy-conscious manual country choice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<CountryTrustStatement />);

    fireEvent.click(screen.getByText('Choose a country manually'));
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: "Cote d'Ivoire" } });
    fireEvent.change(screen.getByLabelText('ISO code'), { target: { value: 'CI' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(
      await screen.findByText(/trusted attendance infrastructure for Ivorian institutions/i),
    ).toBeInTheDocument();
    expect(localStorage.getItem('attendity-country-personalization-v1')).toContain('manual');
  });
});
