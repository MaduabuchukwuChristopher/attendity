import { ROLE_PERMISSIONS } from '@qr/shared';
import type {
  AcademicStructureItem,
  AcademicStructureKind,
  AcademicStructurePage,
  ApiResponse,
} from '@qr/types';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
} from '@qr/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Search, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { StatusBadge } from '../../components/status-badge.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';

const structureKinds: readonly AcademicStructureKind[] = [
  'campus',
  'faculty',
  'programme',
  'level',
  'academic_session',
  'term',
  'venue',
];

const kindLabels: Readonly<Record<AcademicStructureKind, string>> = {
  campus: 'Campuses',
  faculty: 'Faculties or schools',
  programme: 'Programmes',
  level: 'Levels',
  academic_session: 'Academic sessions',
  term: 'Semesters or terms',
  venue: 'Venues',
};

const parentKinds: Readonly<Record<AcademicStructureKind, readonly AcademicStructureKind[]>> = {
  campus: [],
  faculty: ['campus'],
  programme: ['faculty'],
  level: ['programme'],
  academic_session: [],
  term: ['academic_session'],
  venue: ['campus'],
};

function localDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoDate(data: FormData, key: string): string | undefined {
  const value = data.get(key);
  return typeof value === 'string' && value ? new Date(value).toISOString() : undefined;
}

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export default function InstitutionStructurePage() {
  const user = useAuthStore((state) => state.user);
  const { notify } = useDashboardToast();
  const client = useQueryClient();
  const canManage = Boolean(user && ROLE_PERMISSIONS[user.role].includes('courses:write'));
  const [kind, setKind] = useState<AcademicStructureKind>('campus');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AcademicStructureItem | 'create' | null>(null);
  const [deactivating, setDeactivating] = useState<AcademicStructureItem | null>(null);
  const [message, setMessage] = useState('');

  const records = useQuery({
    queryKey: ['academic', 'structure', kind, status, search, page],
    enabled: Boolean(user),
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<AcademicStructurePage>>('/academic/structure', {
          params: { kind, status, search, page, limit: 25 },
        })
      ).data.data,
  });
  const parentOptions = useQuery({
    queryKey: ['academic', 'structure', 'options'],
    enabled: Boolean(user && editing),
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<AcademicStructurePage>>('/academic/structure', {
          params: { kind: 'all', status: 'active', page: 1, limit: 100 },
        })
      ).data.data.items,
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing === 'create'
        ? apiClient.post('/academic/structure', body)
        : apiClient.patch(`/academic/structure/${editing?.id}`, body),
    onSuccess: async () => {
      setEditing(null);
      setMessage('Academic structure saved successfully.');
      notify({
        tone: 'success',
        title: 'Academic structure saved',
        message: 'The academic structure record was saved successfully.',
      });
      await client.invalidateQueries({ queryKey: ['academic', 'structure'] });
    },
  });
  const deactivate = useMutation({
    mutationFn: (recordId: string) => apiClient.delete(`/academic/structure/${recordId}`),
    onSuccess: async () => {
      setDeactivating(null);
      setMessage('The record is now inactive and remains available for historical references.');
      notify({
        tone: 'success',
        title: 'Record deactivated',
        message: 'The record is inactive and remains available for historical references.',
      });
      await client.invalidateQueries({ queryKey: ['academic', 'structure'] });
    },
  });

  if (!user)
    return (
      <DashboardLayout>
        <ErrorState
          title="Your session has ended"
          description="Sign in to manage academic structure."
        />
      </DashboardLayout>
    );

  const selectedKind = editing === 'create' ? kind : (editing?.kind ?? kind);
  const allowedParentKinds = parentKinds[selectedKind];
  const possibleParents = (parentOptions.data ?? []).filter(
    (item) =>
      allowedParentKinds.includes(item.kind) &&
      item.id !== (editing === 'create' ? '' : editing?.id),
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parentId = text(data, 'parentId');
    const description = text(data, 'description');
    const body = {
      ...(editing === 'create' ? { kind: selectedKind } : {}),
      code: text(data, 'code'),
      name: text(data, 'name'),
      ...(description ? { description } : {}),
      ...(parentId ? { parentId } : {}),
      ...(isoDate(data, 'startsAt') ? { startsAt: isoDate(data, 'startsAt') } : {}),
      ...(isoDate(data, 'endsAt') ? { endsAt: isoDate(data, 'endsAt') } : {}),
      isCurrent: data.get('isCurrent') === 'on',
      status: text(data, 'status') || 'active',
    };
    save.mutate(body);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Institution configuration</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Academic structure</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
            Maintain the institution hierarchy and academic calendar used by audiences, schedules,
            events, reporting, and onboarding.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setEditing('create')}>
            <Plus aria-hidden="true" size={17} /> Add{' '}
            {kindLabels[kind].toLowerCase().replace(/s$/, '')}
          </Button>
        ) : null}
      </div>

      <Card className="mt-6 p-4">
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Academic structure categories"
        >
          {structureKinds.map((item) => (
            <button
              aria-selected={kind === item}
              className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${kind === item ? 'bg-primary text-white' : 'border border-border dark:border-slate-700'}`}
              key={item}
              onClick={() => {
                setKind(item);
                setPage(1);
              }}
              role="tab"
              type="button"
            >
              {kindLabels[item]}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
          <label className="relative">
            <span className="sr-only">Search academic structure</span>
            <Search aria-hidden="true" className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              placeholder={`Search ${kindLabels[kind].toLowerCase()}`}
              type="search"
              value={search}
            />
          </label>
          <select
            aria-label="Record status"
            className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
            onChange={(event) => {
              setStatus(event.currentTarget.value as typeof status);
              setPage(1);
            }}
            value={status}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </div>
      </Card>

      {message ? (
        <p
          aria-live="polite"
          className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300"
        >
          {message}
        </p>
      ) : null}

      <section className="mt-6">
        {records.isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : records.isError ? (
          <ErrorState
            title="Academic structure unavailable"
            description="Please retry this institution request."
            retry={() => void records.refetch()}
          />
        ) : records.data?.items.length ? (
          <>
            <DataTable
              caption={`${kindLabels[kind]} configuration`}
              columns={[
                { id: 'code', header: 'Code', cell: (row) => row.code, tone: 'blue' },
                {
                  id: 'name',
                  header: 'Name',
                  cell: (row) => <span className="font-semibold">{row.name}</span>,
                  tone: 'navy',
                },
                {
                  id: 'parent',
                  header: 'Parent',
                  cell: (row) => row.parent?.name ?? 'Institution-wide',
                  tone: 'violet',
                },
                {
                  id: 'period',
                  header: 'Period',
                  cell: (row) =>
                    row.startsAt
                      ? `${new Date(row.startsAt).toLocaleDateString()}${row.endsAt ? ` – ${new Date(row.endsAt).toLocaleDateString()}` : ''}`
                      : 'Not time-bound',
                  tone: 'teal',
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={row.status} status={row.status} />
                      {row.isCurrent ? <Badge tone="info">Current</Badge> : null}
                    </div>
                  ),
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  cell: (row) =>
                    canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`Edit ${row.name}`}
                          className="min-h-9 px-3"
                          onClick={() => setEditing(row)}
                          variant="secondary"
                        >
                          <Pencil aria-hidden="true" size={15} /> Edit
                        </Button>
                        {row.status === 'active' ? (
                          <Button
                            className="min-h-9 gap-2 px-3"
                            onClick={() => setDeactivating(row)}
                            variant="danger"
                          >
                            <Power aria-hidden="true" size={15} />
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      'Read only'
                    ),
                },
              ]}
              rows={records.data.items}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Page {records.data.pagination.page} of {records.data.pagination.pages} ·{' '}
                {records.data.pagination.total} records
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  variant="secondary"
                >
                  Previous
                </Button>
                <Button
                  disabled={page >= records.data.pagination.pages}
                  onClick={() => setPage((value) => value + 1)}
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={`No ${kindLabels[kind].toLowerCase()}`}
            description="Create the first governed record for this institution."
          />
        )}
      </section>

      <Dialog
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing === 'create'
            ? `Add ${kindLabels[kind].toLowerCase()}`
            : `Edit ${editing?.name ?? 'record'}`
        }
        footer={
          <Button disabled={save.isPending} form="structure-editor" type="submit">
            {save.isPending ? 'Saving…' : 'Save record'}
          </Button>
        }
      >
        <form className="grid gap-4" id="structure-editor" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              defaultValue={editing === 'create' ? '' : editing?.code}
              label="Code"
              maxLength={32}
              name="code"
              required
            />
            <Input
              defaultValue={editing === 'create' ? '' : editing?.name}
              label="Name"
              maxLength={180}
              name="name"
              required
            />
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Description (optional)
            <textarea
              className="min-h-24 rounded-xl border border-border bg-surface px-3 py-2 dark:border-slate-700 dark:bg-dark-surface"
              defaultValue={editing === 'create' ? '' : editing?.description}
              maxLength={1000}
              name="description"
            />
          </label>
          {allowedParentKinds.length ? (
            <label className="grid gap-2 text-sm font-medium">
              Parent record
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
                defaultValue={editing === 'create' ? '' : editing?.parent?.id}
                name="parentId"
              >
                <option value="">Institution-wide</option>
                {possibleParents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {kindLabels[item.kind]} · {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {['academic_session', 'term'].includes(selectedKind) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                defaultValue={editing === 'create' ? '' : localDate(editing?.startsAt)}
                label="Starts at"
                name="startsAt"
                type="datetime-local"
              />
              <Input
                defaultValue={editing === 'create' ? '' : localDate(editing?.endsAt)}
                label="Ends at"
                name="endsAt"
                type="datetime-local"
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {['academic_session', 'term'].includes(selectedKind) ? (
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  defaultChecked={editing === 'create' ? false : editing?.isCurrent}
                  name="isCurrent"
                  type="checkbox"
                />{' '}
                Mark as current
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-medium">
              Status
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
                defaultValue={editing === 'create' ? 'active' : editing?.status}
                name="status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
          <MutationFormFeedback
            error={save.error}
            errorFallback="The record could not be saved. Check for duplicate codes or invalid hierarchy selections."
            status={save.isSuccess ? 'success' : save.isError ? 'error' : 'idle'}
            submissionId={save.submittedAt}
            successMessage="Academic structure saved successfully."
            successTitle="Academic structure saved"
          />
        </form>
      </Dialog>

      <Dialog
        isOpen={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        title="Deactivate academic record"
        footer={
          <Button
            disabled={deactivate.isPending}
            onClick={() => deactivating && deactivate.mutate(deactivating.id)}
            variant="danger"
          >
            Deactivate
          </Button>
        }
      >
        <div className="flex gap-3">
          <ShieldCheck aria-hidden="true" className="mt-1 shrink-0 text-primary" />
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {deactivating?.name} will no longer appear in active selections. Historical records
            remain intact. Active child records must be reassigned or deactivated first.
          </p>
        </div>
        <div className="mt-4">
          <MutationFormFeedback
            error={deactivate.error}
            errorFallback="This record could not be deactivated. Resolve active child records and retry."
            status={deactivate.isSuccess ? 'success' : deactivate.isError ? 'error' : 'idle'}
            submissionId={deactivate.submittedAt}
            successMessage="The academic record is now inactive."
            successTitle="Record deactivated"
          />
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
