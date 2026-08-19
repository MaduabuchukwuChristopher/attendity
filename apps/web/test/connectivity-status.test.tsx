import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectivityStatus } from '../src/components/connectivity-status.js';

describe('portal update prompt', () => {
  it('asks the waiting service worker to activate when Update is selected', () => {
    const applyUpdate = vi.fn();
    document.addEventListener('attendity:apply-update', applyUpdate);

    render(<ConnectivityStatus />);
    fireEvent(document, new Event('attendity:update-ready'));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(applyUpdate).toHaveBeenCalledOnce();
    document.removeEventListener('attendity:apply-update', applyUpdate);
  });
});
