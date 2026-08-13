import { act, fireEvent, render, screen } from '@testing-library/react';
import type * as FramerMotion from 'framer-motion';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductDemo } from '../src/components/product-demo.js';

const motionPreference = vi.hoisted(() => ({ reduce: true }));
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => motionPreference.reduce };
});

describe('ProductDemo', () => {
  afterEach(() => {
    motionPreference.reduce = true;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('supports the standard tab-list arrow, Home, and End keys', () => {
    render(<ProductDemo />);
    const first = screen.getByRole('tab', { name: '1. Create session' });
    const second = screen.getByRole('tab', { name: '2. Activate dynamic QR' });
    const last = screen.getByRole('tab', { name: '7. Refresh standing' });

    fireEvent.focus(first);
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(second, { key: 'End' });
    expect(last).toHaveFocus();
    expect(last).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(last, { key: 'Home' });
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute('aria-selected', 'true');
  });

  it('starts from the first step and advances only after entering the viewport', () => {
    motionPreference.reduce = false;
    vi.useFakeTimers();
    let observerCallback: IntersectionObserverCallback | undefined;
    class TestIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0.35];
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    render(<ProductDemo />);
    const first = screen.getByRole('tab', { name: '1. Create session' });
    const second = screen.getByRole('tab', { name: '2. Activate dynamic QR' });

    void act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(first).toHaveAttribute('aria-selected', 'true');

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    void act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(second).toHaveAttribute('aria-selected', 'true');
  });
});
