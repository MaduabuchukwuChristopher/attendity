import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  Input,
  Skeleton,
} from '@qr/ui';
import { MailWarning, ShieldBan, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { StatusBadge } from '../../components/status-badge.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import type { StaffInvitationSummary } from '@qr/types';
import { StaffInvitationDialog } from './staff-invitation-dialog.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';
interface User {
  readonly _id: string;
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
  readonly accountStatus: string;
  readonly campus?: string;
  readonly facultyName?: string;
  readonly departmentId?: string;
  readonly programme?: string;
  readonly level?: string;
}
interface Department {
  readonly _id: string;
  readonly code: string;
  readonly name: string;
  readonly facultyName: string;
}
const selectClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';
export default function UserManagementPage() {
  const user = useAuthStore((state) => state.user);
  const { notify } = useDashboardToast();
  const client = useQueryClient();
  const [scoping, setScoping] = useState<User | null>(null);
  const [inviting, setInviting] = useState(false);
  const canManage = user?.role === 'super_admin' || user?.role === 'university_admin';
  const query = useQuery({
    queryKey: ['users'],
    enabled: user !== null,
    queryFn: async () => {
      const records = (await apiClient.get<{ data: readonly User[] }>('/users')).data.data;
      return records.map((record) => ({ ...record, id: record._id }));
    },
  });
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      apiClient.patch(`/users/${id}/status`, { status }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['users'] }),
  });
  const departments = useQuery({
    queryKey: ['academic', 'departments'],
    queryFn: async () =>
      (await apiClient.get<{ data: readonly Department[] }>('/academic/departments')).data.data,
  });
  const updateScope = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      readonly id: string;
      readonly body: Record<string, string>;
    }) => apiClient.patch(`/users/${id}/scope`, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['users'] });
      setScoping(null);
      notify({
        tone: 'success',
        title: 'Communication scope saved',
        message: 'The communication scope was saved successfully.',
      });
    },
  });
  const invitations = useQuery({
    queryKey: ['staff-invitations'],
    enabled: Boolean(canManage),
    queryFn: async () =>
      (await apiClient.get<{ data: readonly StaffInvitationSummary[] }>('/users/invitations')).data
        .data,
  });
  const revokeInvitation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/users/invitations/${id}/revoke`),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['staff-invitations'] }),
  });
  const submitScope = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scoping) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => {
      const item = data.get(key);
      return typeof item === 'string' ? item.trim() : '';
    };
    updateScope.mutate({
      id: scoping.id,
      body: Object.fromEntries(
        ['campus', 'facultyName', 'departmentId', 'programme', 'level']
          .map((key) => [key, value(key)] as const)
          .filter(([, item]) => item),
      ),
    });
  };
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState
          title="Your session has ended"
          description="Sign in to view institution users."
        />
      </DashboardLayout>
    );
  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Institution administration</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">People</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Institution users, secure staff invitations, profile completion, and account access.
          </p>
        </div>
        {canManage ? <Button onClick={() => setInviting(true)}>Invite staff</Button> : null}
      </div>
      {canManage ? (
        <Card className="mt-8 p-5" tone="violet">
          <CardHeader
            description="Pending and completed invitations for authorised institution staff"
            icon={<MailWarning aria-hidden="true" size={20} />}
            title="Recent staff invitations"
            tone="violet"
          />
          <div className="mt-4">
            {invitations.data?.length ? (
              <DataTable
                caption="Staff invitations"
                columns={[
                  { id: 'email', header: 'Email', cell: (row) => row.email, tone: 'blue' },
                  {
                    id: 'role',
                    header: 'Role',
                    cell: (row) => (
                      <IdentifierBadge tone="violet">{row.role.replace('_', ' ')}</IdentifierBadge>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => <StatusBadge label={row.status} status={row.status} />,
                  },
                  {
                    id: 'expires',
                    header: 'Expires',
                    cell: (row) => new Date(row.expiresAt).toLocaleString(),
                    tone: 'teal',
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (row) =>
                      row.status === 'pending' ? (
                        <Button
                          className="gap-2"
                          disabled={revokeInvitation.isPending}
                          onClick={() => revokeInvitation.mutate(row.id)}
                          variant="danger"
                        >
                          <ShieldBan aria-hidden="true" size={16} />
                          Revoke
                        </Button>
                      ) : (
                        '—'
                      ),
                  },
                ]}
                rowTone={(row) =>
                  row.status === 'accepted' ? 'green' : row.status === 'pending' ? 'gold' : 'rose'
                }
                rows={invitations.data}
              />
            ) : (
              <EmptyState
                title="No staff invitations"
                description="Invite lecturers, examiners, and authorised institution staff securely."
              />
            )}
          </div>
        </Card>
      ) : null}
      <section className="mt-8">
        {query.isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Unable to load users"
            description="Please retry your request."
            retry={() => void query.refetch()}
          />
        ) : query.data?.length ? (
          <DataTable
            caption="Institution users"
            columns={[
              {
                id: 'name',
                header: 'Name',
                cell: (row) => `${row.firstName} ${row.lastName}`,
                tone: 'navy',
              },
              { id: 'email', header: 'Email', cell: (row) => row.email, tone: 'blue' },
              {
                id: 'role',
                header: 'Role',
                cell: (row) => (
                  <IdentifierBadge tone="blue">{row.role.replace('_', ' ')}</IdentifierBadge>
                ),
              },
              {
                id: 'status',
                header: 'Status',
                cell: (row) => (
                  <StatusBadge
                    label={row.accountStatus.replace('_', ' ')}
                    status={row.accountStatus}
                  />
                ),
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (row) =>
                  canManage && row.id !== user.id ? (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setScoping(row)} variant="secondary">
                        Communication scope
                      </Button>
                      <Button
                        className="gap-2"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({
                            id: row.id,
                            status: row.accountStatus === 'active' ? 'suspended' : 'active',
                          })
                        }
                        variant={row.accountStatus === 'active' ? 'danger' : 'primary'}
                      >
                        {row.accountStatus === 'active' ? (
                          <ShieldBan aria-hidden="true" size={16} />
                        ) : (
                          <ShieldCheck aria-hidden="true" size={16} />
                        )}
                        {row.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  ) : (
                    '—'
                  ),
              },
            ]}
            rowTone={(row) => (row.accountStatus === 'active' ? 'green' : 'rose')}
            rows={query.data}
          />
        ) : (
          <EmptyState
            title="No users found"
            description="Users created for this institution will appear here."
          />
        )}
      </section>
      <div className="mt-4">
        <MutationFormFeedback
          error={updateStatus.error}
          errorFallback="The account status could not be updated. Please retry."
          status={updateStatus.isSuccess ? 'success' : updateStatus.isError ? 'error' : 'idle'}
          submissionId={updateStatus.submittedAt}
          successMessage="The account status was updated successfully."
          successTitle="Account updated"
        />
      </div>
      <Dialog
        footer={
          <Button disabled={updateScope.isPending} form="user-scope-form" type="submit">
            {updateScope.isPending ? 'Saving…' : 'Save scope'}
          </Button>
        }
        isOpen={scoping !== null}
        onClose={() => setScoping(null)}
        title="Communication scope"
      >
        <form className="grid gap-4" id="user-scope-form" onSubmit={submitScope}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This scope limits academic-unit announcement publishers and improves recipient
            targeting.
          </p>
          <Input defaultValue={scoping?.campus} label="Campus" name="campus" />
          <Input defaultValue={scoping?.facultyName} label="Faculty or school" name="facultyName" />
          <label className="grid gap-2 text-sm font-medium">
            Department
            <select
              className={selectClass}
              defaultValue={scoping?.departmentId ?? ''}
              name="departmentId"
            >
              <option value="">No department</option>
              {departments.data?.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.code} — {department.name}
                </option>
              ))}
            </select>
          </label>
          <Input defaultValue={scoping?.programme} label="Programme" name="programme" />
          <Input defaultValue={scoping?.level} label="Level" name="level" />
          <MutationFormFeedback
            error={updateScope.error}
            errorFallback="The communication scope could not be saved. Check that the faculty and department match."
            status={updateScope.isSuccess ? 'success' : updateScope.isError ? 'error' : 'idle'}
            submissionId={updateScope.submittedAt}
            successMessage="The communication scope was saved successfully."
            successTitle="Scope saved"
          />
        </form>
      </Dialog>
      <MutationFormFeedback
        error={revokeInvitation.error}
        errorFallback="The staff invitation could not be revoked."
        status={
          revokeInvitation.isSuccess ? 'success' : revokeInvitation.isError ? 'error' : 'idle'
        }
        submissionId={revokeInvitation.submittedAt}
        successMessage="The staff invitation was revoked successfully."
        successTitle="Invitation revoked"
      />
      <StaffInvitationDialog isOpen={inviting} onClose={() => setInviting(false)} />
    </DashboardLayout>
  );
}
