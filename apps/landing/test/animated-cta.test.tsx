import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimatedCta } from '../src/components/animated-cta.js';

function renderCta(props: Partial<ComponentProps<typeof AnimatedCta>> = {}) {
  return render(
    <MemoryRouter>
      <AnimatedCta to="/demo" {...props}>
        Book a Demo
      </AnimatedCta>
    </MemoryRouter>,
  );
}

describe('AnimatedCta', () => {
  afterEach(() => {
    document.querySelector('#product-demo')?.remove();
  });

  it('renders an accessible, reusable navigation action', () => {
    renderCta({ variant: 'secondary' });

    const link = screen.getByRole('link', { name: 'Book a Demo' });
    expect(link).toHaveAttribute('href', '/demo');
    expect(link.className).toContain('dark:text-slate-100');
  });

  it('removes unavailable actions from keyboard navigation', () => {
    renderCta({ disabled: true });

    const link = screen.getByRole('link', { name: 'Book a Demo' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
  });

  it('announces its loading state', () => {
    renderCta({ loading: true });

    expect(screen.getByRole('link', { name: 'Book a Demo, loading' })).toHaveTextContent(
      'Loading…',
    );
  });

  it('scrolls to and focuses an in-page destination', () => {
    const target = document.createElement('section');
    const scrollIntoView = vi.fn<(options?: ScrollIntoViewOptions | boolean) => void>();
    target.id = 'product-demo';
    target.tabIndex = -1;
    target.scrollIntoView = scrollIntoView;
    document.body.append(target);
    renderCta({ to: '#product-demo' });

    fireEvent.click(screen.getByRole('link', { name: 'Book a Demo' }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
    expect(target).toHaveFocus();
  });
});
