import type { ApiResponse, AuditLogPage } from '@qr/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@qr/ui';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '../../api/client.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';

interface Filters {
  readonly search: string;
  readonly action: string;
  readonly resourceType: string;
  readonly from: string;
  readonly to: string;
  readonly page: number;
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    action: 'all',
    resourceType: 'all',
    from: '',
    to: '',
    page: 1,
  });
  const query = new URLSearchParams({
    search: filters.search,
    action: filters.action,
    resourceType: filters.resourceType,
    ...(filters.from ? { from: new Date(`${filters.from}T00:00:00.000Z`).toISOString() } : {}),
    ...(filters.to ? { to: new Date(`${filters.to}T23:59:59.999Z`).toISOString() } : {}),
    page: String(filters.page),
    limit: '25',
  });
  const audit = useQuery({
    queryKey: ['audit', filters],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<AuditLogPage>>(`/audit?${query.toString()}`)).data.data,
  });
  return (
    <DashboardLayout>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={24} />
        </span>
        <div>
          <p className="text-sm font-semibold text-primary">Institution governance</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Audit logs</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
            Review immutable administrative activity within this institution. Network identifiers
            and sensitive values are never displayed.
          </p>
        </div>
      </div>
      <Card className="mt-6 p-4" tone="navy">
        <CardHeader
          description="Narrow the immutable activity trail by actor, record, action, or date."
          icon={<Search size={19} />}
          title="Audit filters"
          tone="navy"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative">
            <span className="sr-only">Search audit records</span>
            <Search className="absolute left-3 top-3 text-slate-400" size={17} />
            <input
              className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.currentTarget.value,
                  page: 1,
                }))
              }
              placeholder="Action or record ID"
              type="search"
              value={filters.search}
            />
          </label>
          <select
            aria-label="Audit action"
            className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
            onChange={(event) =>
              setFilters((current) => ({ ...current, action: event.currentTarget.value, page: 1 }))
            }
            value={filters.action}
          >
            <option value="all">All actions</option>
            {(audit.data?.filterOptions.actions ?? []).map((action) => (
              <option key={action} value={action}>
                {action.replaceAll('.', ' ')}
              </option>
            ))}
          </select>
          <select
            aria-label="Audit resource type"
            className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                resourceType: event.currentTarget.value,
                page: 1,
              }))
            }
            value={filters.resourceType}
          >
            <option value="all">All record types</option>
            {(audit.data?.filterOptions.resourceTypes ?? []).map((resource) => (
              <option key={resource} value={resource}>
                {resource.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            From
            <input
              className="h-9 rounded-xl border border-border bg-surface px-3 text-sm dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setFilters((current) => ({ ...current, from: event.currentTarget.value, page: 1 }))
              }
              type="date"
              value={filters.from}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            To
            <input
              className="h-9 rounded-xl border border-border bg-surface px-3 text-sm dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setFilters((current) => ({ ...current, to: event.currentTarget.value, page: 1 }))
              }
              type="date"
              value={filters.to}
            />
          </label>
        </div>
      </Card>
      <section className="mt-6">
        {audit.isLoading ? (
          <Skeleton className="h-96" />
        ) : audit.isError ? (
          <ErrorState
            title="Audit records are unavailable"
            description="Retry this authorized audit request."
            retry={() => void audit.refetch()}
          />
        ) : audit.data?.items.length ? (
          <DataTable
            caption="Institution audit records"
            columns={[
              {
                id: 'time',
                header: 'Time',
                cell: (row) => new Date(row.createdAt).toLocaleString(),
                tone: 'teal',
              },
              {
                id: 'action',
                header: 'Action',
                cell: (row) => <Badge tone="info">{row.action.replaceAll('.', ' ')}</Badge>,
              },
              {
                id: 'record',
                header: 'Record',
                cell: (row) => (
                  <div>
                    <p className="font-semibold">{row.resourceType.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-slate-500">{row.resourceId}</p>
                  </div>
                ),
                tone: 'blue',
              },
              {
                id: 'actor',
                header: 'Actor',
                cell: (row) => row.actorId ?? 'System worker',
                tone: 'violet',
              },
              {
                id: 'fields',
                header: 'Fields changed',
                cell: (row) => row.changedFields.join(', ') || 'Lifecycle action',
                tone: 'gold',
              },
            ]}
            rows={audit.data.items}
          />
        ) : (
          <EmptyState
            title="No matching audit records"
            description="Administrative actions within the selected filters will appear here."
          />
        )}
      </section>
      {audit.data && audit.data.pagination.pages > 1 ? (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {audit.data.pagination.page} of {audit.data.pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={filters.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={filters.page >= audit.data.pagination.pages}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
