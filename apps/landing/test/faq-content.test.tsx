import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { FaqContent } from '../src/components/faq-content.js';

describe('FaqContent', () => {
  it('offers a substantial answer library and filters it by search text', () => {
    render(
      <MemoryRouter>
        <FaqContent />
      </MemoryRouter>,
    );

    expect(screen.getByText('Showing 14 answers')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search frequently asked questions' }), {
      target: { value: 'examination clearance' },
    });
    expect(screen.getByText('Showing 2 answers')).toBeInTheDocument();
    expect(screen.getByText('How is examination clearance verified?')).toBeInTheDocument();
  }, 15_000);
});
