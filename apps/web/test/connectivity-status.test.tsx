import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectivityStatus } from '../src/components/connectivity-status.js';

describe('ConnectivityStatus', () => {
  it('announces a connection loss and clears the message after reconnection', () => {
    render(<ConnectivityStatus />);
    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
    fireEvent(window, new Event('online'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers a reload when an application update is ready', () => {
    render(<ConnectivityStatus />);
    fireEvent(document, new Event('attendity:update-ready'));
    expect(screen.getByRole('button', { name: 'Update' })).toBeVisible();
  });
});
