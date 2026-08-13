import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StaffInvitableRole } from '@qr/types';
import { Button, Dialog, Input } from '@qr/ui';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { apiErrorMessage } from '../auth/auth-utils.js';
import { FormActionFeedback } from '../../components/form-action-feedback.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';

export function StaffInvitationDialog({
  isOpen,
  onClose,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}) {
  const client = useQueryClient();
  const { notify } = useDashboardToast();
  const [role, setRole] = useState<StaffInvitableRole>('lecturer');
  const [error, setError] = useState('');
  const invite = useMutation({
    mutationFn: (body: Record<string, string>) => apiClient.post('/users/invitations', body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['staff-invitations'] });
      setError('');
      notify({
        tone: 'success',
        title: 'Invitation sent',
        message: 'The secure staff invitation was sent successfully.',
      });
      onClose();
    },
    onError: (requestError) => {
      const message = apiErrorMessage(requestError, 'The invitation could not be sent.');
      setError(message);
      notify({ tone: 'error', title: 'Invitation not sent', message });
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get('email');
    invite.mutate({ email: typeof email === 'string' ? email.trim() : '', role });
  };
  return (
    <Dialog
      footer={
        <Button disabled={invite.isPending} form="staff-invitation-form" type="submit">
          {invite.isPending ? 'Sending…' : 'Send secure invitation'}
        </Button>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Invite institution staff"
    >
      <form className="grid gap-5" id="staff-invitation-form" onSubmit={submit}>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          A secure invitation gives the recipient 72 hours to create their account. Students
          continue to use public student registration.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setRole('lecturer')}
            type="button"
            variant={role === 'lecturer' ? 'primary' : 'secondary'}
          >
            Invite lecturer
          </Button>
          <Button
            onClick={() => setRole('examiner')}
            type="button"
            variant={role === 'examiner' ? 'primary' : 'secondary'}
          >
            Invite examiner
          </Button>
        </div>
        <Input autoComplete="email" label="Institution email" name="email" required type="email" />
        <FormActionFeedback message={error || undefined} status={error ? 'error' : 'idle'} />
      </form>
    </Dialog>
  );
}
