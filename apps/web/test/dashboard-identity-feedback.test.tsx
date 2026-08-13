import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormActionFeedback } from '../src/components/form-action-feedback.js';
import { MutationFormFeedback } from '../src/components/mutation-form-feedback.js';
import { UserAvatar } from '../src/components/user-avatar.js';
import {
  DashboardToastProvider,
  useDashboardToast,
} from '../src/contexts/dashboard-toast-context.js';
import { useAuthStore } from '../src/store/auth-store.js';

describe('dashboard identity presentation', () => {
  beforeEach(() => useAuthStore.getState().clearSession());

  it('patches presentation data without replacing the authenticated session', () => {
    useAuthStore.getState().setSession(
      {
        id: 'user-1',
        universityId: 'university-1',
        email: 'ada@example.edu',
        fullName: 'Ada Okafor',
        role: 'student',
      },
      'access-token',
    );

    useAuthStore.getState().updateUserPresentation({
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/ada.jpg',
    });

    expect(useAuthStore.getState().user).toMatchObject({
      id: 'user-1',
      email: 'ada@example.edu',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/ada.jpg',
    });
    expect(useAuthStore.getState().accessToken).toBe('access-token');
  });

  it('renders the saved photograph and falls back to initials when it cannot load', () => {
    render(
      <UserAvatar
        fullName="Ada Okafor"
        photoUrl="https://res.cloudinary.com/demo/image/upload/ada.jpg"
      />,
    );

    const image = screen.getByRole('img', { name: 'Ada Okafor profile photograph' });
    expect(image).toHaveAttribute('src', 'https://res.cloudinary.com/demo/image/upload/ada.jpg');
    fireEvent.error(image);
    expect(screen.getByText('AO')).toBeVisible();
  });
});

function ToastHarness() {
  const { notify } = useDashboardToast();
  return (
    <>
      <button
        onClick={() => notify({ tone: 'success', title: 'Saved', message: 'Profile saved.' })}
        type="button"
      >
        Notify success
      </button>
      <button
        onClick={() => notify({ tone: 'error', title: 'Failed', message: 'Profile was rejected.' })}
        type="button"
      >
        Notify error
      </button>
    </>
  );
}

describe('dashboard form feedback', () => {
  it('renders bold inline feedback with accessible status semantics', () => {
    const { rerender } = render(<FormActionFeedback message="Profile saved." status="success" />);
    expect(screen.getByRole('status')).toHaveTextContent('Profile saved.');
    expect(screen.getByRole('status')).toHaveClass('font-bold');

    rerender(<FormActionFeedback message="Profile was rejected." status="error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Profile was rejected.');
  });

  it('shows dismissible success and error notifications and auto-dismisses them', () => {
    vi.useFakeTimers();
    render(
      <DashboardToastProvider>
        <ToastHarness />
      </DashboardToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notify success' }));
    expect(screen.getByText('Saved')).toBeVisible();
    expect(screen.getByText('Profile saved.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Saved notification' }));
    expect(screen.queryByText('Profile saved.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notify error' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Profile was rejected.');
    void act(() => vi.advanceTimersByTime(5_000));
    expect(screen.queryByText('Profile was rejected.')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('keeps only the three newest notifications visible', () => {
    render(
      <DashboardToastProvider>
        <ToastHarness />
      </DashboardToastProvider>,
    );
    const success = screen.getByRole('button', { name: 'Notify success' });
    fireEvent.click(success);
    fireEvent.click(success);
    fireEvent.click(success);
    fireEvent.click(success);
    expect(screen.getAllByText('Profile saved.')).toHaveLength(3);
  });

  it('combines durable mutation feedback with one popup per submission', () => {
    const { rerender } = render(
      <DashboardToastProvider>
        <MutationFormFeedback
          errorFallback="The record could not be saved."
          error={undefined}
          status="success"
          submissionId={10}
          successMessage="The academic record was saved."
          successTitle="Record saved"
        />
      </DashboardToastProvider>,
    );
    expect(screen.getAllByText('The academic record was saved.')).toHaveLength(2);
    rerender(
      <DashboardToastProvider>
        <MutationFormFeedback
          errorFallback="The record could not be saved."
          error={undefined}
          status="success"
          submissionId={10}
          successMessage="The academic record was saved."
          successTitle="Record saved"
        />
      </DashboardToastProvider>,
    );
    expect(screen.getAllByText('The academic record was saved.')).toHaveLength(2);
  });
});
