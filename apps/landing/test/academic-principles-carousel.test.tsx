import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AcademicPrinciplesCarousel } from '../src/components/academic-principles-carousel.js';

describe('AcademicPrinciplesCarousel', () => {
  it('presents ten principles and supports next, previous, and wraparound navigation', () => {
    render(<AcademicPrinciplesCarousel />);

    expect(screen.getByRole('status')).toHaveTextContent('Quotation 1 of 10');
    fireEvent.click(screen.getByRole('button', { name: 'Next academic principle' }));
    expect(screen.getByRole('status')).toHaveTextContent('Quotation 2 of 10');
    fireEvent.click(screen.getByRole('button', { name: 'Previous academic principle' }));
    expect(screen.getByRole('status')).toHaveTextContent('Quotation 1 of 10');
    fireEvent.click(screen.getByRole('button', { name: 'Previous academic principle' }));
    expect(screen.getByRole('status')).toHaveTextContent('Quotation 10 of 10');
  });
});
