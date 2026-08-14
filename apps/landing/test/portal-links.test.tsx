import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Navbar } from '../src/components/navbar.js';
import { LandingLayout } from '../src/layouts/landing-layout.js';

const hostedPortalUrl = 'https://attendity-portal.vercel.app/login';

describe('hosted portal links', () => {
  it('sends desktop and mobile navigation sign-ins to the hosted portal', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      hostedPortalUrl,
    );
    expect(screen.getByRole('link', { name: 'Institution sign in' })).toHaveAttribute(
      'href',
      hostedPortalUrl,
    );
  });

  it('sends the footer institution sign-in to the hosted portal', () => {
    render(
      <MemoryRouter>
        <LandingLayout>
          <main>Attendity</main>
        </LandingLayout>
      </MemoryRouter>,
    );

    const institutionLinks = screen.getAllByRole('link', { name: 'Institution sign in' });
    expect(institutionLinks.at(-1)).toHaveAttribute('href', hostedPortalUrl);
  });
});
