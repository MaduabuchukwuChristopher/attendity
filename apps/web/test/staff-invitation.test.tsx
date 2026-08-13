import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaffInvitationDialog } from '../src/features/users/staff-invitation-dialog.js';

describe('staff invitation controls', () => {
  it('offers a direct lecturer invitation action', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StaffInvitationDialog isOpen onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'Invite lecturer' })).toBeVisible();
    expect(screen.getByText(/^A secure invitation/i)).toBeVisible();
  });
});
