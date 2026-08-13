import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackToTopButton } from '../src/components/back-to-top-button.js';

describe('BackToTopButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  it('appears after meaningful scrolling and returns to the top', () => {
    render(<BackToTopButton />);

    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 640 });
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: /back to top/i }));

    expect(window.scrollTo).toHaveBeenCalledWith({ behavior: 'auto', top: 0 });
  });
});
