import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcademicStructurePage, ApiResponse } from '@qr/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  Skeleton,
} from '@qr/ui';
import { BookCopy, GraduationCap, Plus, Power, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { StatusBadge } from '../../components/status-badge.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';

interface Ref {
  readonly _id: string;
  readonly code?: string;
  readonly name?: string;
  readonly title?: string;
  readonly firstName?: string;
  readonly lastName?: string;
}
interface Mapping {
  readonly _id: string;
  readonly courseId: Ref;
  readonly programmeId: Ref;
  readonly levelId: Ref;
  readonly termId: Ref;
  readonly classification: 'core' | 'elective';
  readonly status: 'active' | 'inactive';
  readonly createdAt?: string;
}
interface Assignment {
  readonly _id: string;
  readonly lecturerId: Ref;
  readonly courseId: Ref;
  readonly academicSessionId: Ref;
  readonly termId: Ref;
  readonly assignmentRole: 'primary' | 'co_lecturer';
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: 'active' | 'inactive';
}
interface Course {
  readonly _id: string;
  readonly code: string;
  readonly title: string;
  readonly status: string;
}
interface User {
  readonly _id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly accountStatus: string;
}

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm dark:border-slate-700 dark:bg-dark-surface';
const field = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
};
export default function CurriculumManagementPage() {
  const { notify } = useDashboardToast();
  const client = useQueryClient();
  const [mappingOpen, setMappingOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const refresh = async () => client.invalidateQueries({ queryKey: ['academic'] });
  const mappings = useQuery({
    queryKey: ['academic', 'curriculum'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly Mapping[]>>('/academic/curriculum')).data.data,
  });
  const assignments = useQuery({
    queryKey: ['academic', 'lecturer-assignments'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly Assignment[]>>('/academic/lecturer-assignments'))
        .data.data,
  });
  const courses = useQuery({
    queryKey: ['academic', 'courses'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly Course[]>>('/academic/courses')).data.data.filter(
        (item) => item.status === 'active',
      ),
  });
  const structures = useQuery({
    queryKey: ['academic', 'structure', 'curriculum-options'],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<AcademicStructurePage>>('/academic/structure', {
          params: { kind: 'all', status: 'active', page: 1, limit: 100 },
        })
      ).data.data.items,
  });
  const users = useQuery({
    queryKey: ['users', 'lecturers'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly User[]>>('/users')).data.data.filter(
        (item) => item.role === 'lecturer' && item.accountStatus === 'active',
      ),
  });
  const createMapping = useMutation({
    mutationFn: (body: Record<string, string>) => apiClient.post('/academic/curriculum', body),
    onSuccess: async () => {
      setMappingOpen(false);
      await refresh();
      notify({
        tone: 'success',
        title: 'Curriculum mapping saved',
        message: 'The curriculum mapping was saved successfully.',
      });
    },
  });
  const deactivateMapping = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/academic/curriculum/${id}`),
    onSuccess: refresh,
  });
  const createAssignment = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiClient.post('/academic/lecturer-assignments', body),
    onSuccess: async () => {
      setAssignmentOpen(false);
      await refresh();
      notify({
        tone: 'success',
        title: 'Lecturer assignment saved',
        message: 'The lecturer assignment was saved successfully.',
      });
    },
  });
  const deactivateAssignment = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/academic/lecturer-assignments/${id}/deactivate`),
    onSuccess: refresh,
  });
  const submitMapping = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    createMapping.mutate(
      Object.fromEntries(
        ['courseId', 'programmeId', 'levelId', 'termId', 'classification'].map((key) => [
          key,
          field(data, key),
        ]),
      ),
    );
  };
  const submitAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    createAssignment.mutate({
      lecturerId: field(data, 'lecturerId'),
      courseId: field(data, 'courseId'),
      academicSessionId: field(data, 'academicSessionId'),
      termId: field(data, 'termId'),
      assignmentRole: field(data, 'assignmentRole'),
      startsAt: new Date(field(data, 'startsAt')).toISOString(),
      endsAt: new Date(field(data, 'endsAt')).toISOString(),
    });
  };
  if (
    mappings.isLoading ||
    assignments.isLoading ||
    courses.isLoading ||
    structures.isLoading ||
    users.isLoading
  )
    return (
      <DashboardLayout>
        <Skeleton className="h-[38rem]" />
      </DashboardLayout>
    );
  if (mappings.isError || assignments.isError)
    return (
      <DashboardLayout>
        <ErrorState title="Unable to load curriculum" description="Please retry the request." />
      </DashboardLayout>
    );
  const options = structures.data ?? [];
  const select = (
    name: string,
    label: string,
    records: readonly { readonly id: string; readonly label: string }[],
  ) => (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select className={selectClass} name={name} required>
        <option value="">Select {label.toLowerCase()}</option>
        {records.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Academic governance</p>
          <h1 className="mt-1 text-3xl font-bold">Curriculum and teaching assignments</h1>
          <p className="mt-2 text-slate-500">
            Control programme curricula and period-scoped lecturer access from one audited
            workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAssignmentOpen(true)} variant="secondary">
            <Users size={17} /> Assign lecturer
          </Button>
          <Button onClick={() => setMappingOpen(true)}>
            <Plus size={17} /> Add curriculum mapping
          </Button>
        </div>
      </div>
      <section className="mt-8 grid gap-6">
        <Card className="p-6" tone="violet">
          <CardHeader
            description="Course mappings by programme, level, and academic period"
            icon={<GraduationCap aria-hidden="true" size={21} />}
            title="Programme curriculum"
            tone="violet"
          />
          <div className="mt-5">
            {mappings.data?.length ? (
              <DataTable
                caption="Curriculum mappings"
                columns={[
                  {
                    id: 'course',
                    header: 'Course',
                    cell: (row) => (
                      <span className="flex flex-wrap items-center gap-2">
                        <IdentifierBadge tone="blue">
                          {row.courseId.code ?? 'Course'}
                        </IdentifierBadge>
                        <span>{row.courseId.title ?? ''}</span>
                      </span>
                    ),
                  },
                  {
                    id: 'programme',
                    header: 'Programme and level',
                    cell: (row) => `${row.programmeId.name ?? ''} · ${row.levelId.name ?? ''}`,
                    tone: 'navy',
                  },
                  {
                    id: 'term',
                    header: 'Academic period',
                    cell: (row) => row.termId.name ?? 'Term',
                    tone: 'teal',
                  },
                  {
                    id: 'classification',
                    header: 'Classification',
                    cell: (row) => (
                      <Badge tone={row.classification === 'core' ? 'success' : 'info'}>
                        {row.classification}
                      </Badge>
                    ),
                  },
                  {
                    id: 'state',
                    header: 'State',
                    cell: (row) => <StatusBadge label={row.status} status={row.status} />,
                  },
                  {
                    id: 'created',
                    header: 'Created',
                    cell: (row) =>
                      row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
                    tone: 'teal',
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (row) =>
                      row.status === 'active' ? (
                        <Button
                          className="gap-2 px-3"
                          disabled={deactivateMapping.isPending}
                          onClick={() => deactivateMapping.mutate(row._id)}
                          variant="danger"
                        >
                          <Power aria-hidden="true" size={16} />
                          Deactivate
                        </Button>
                      ) : (
                        'Historical'
                      ),
                  },
                ]}
                rowTone={(row) => (row.status === 'active' ? 'green' : 'gold')}
                rows={mappings.data}
              />
            ) : (
              <EmptyState
                title="No curriculum mappings"
                description="Map courses to a programme, level, and academic term."
              />
            )}
          </div>
        </Card>
        <Card className="p-6" tone="blue">
          <CardHeader
            description="Period-scoped teaching responsibility and access"
            icon={<BookCopy aria-hidden="true" size={21} />}
            title="Lecturer assignments"
            tone="blue"
          />
          <div className="mt-5">
            {assignments.data?.length ? (
              <DataTable
                caption="Lecturer assignments"
                columns={[
                  {
                    id: 'lecturer',
                    header: 'Lecturer',
                    cell: (row) =>
                      `${row.lecturerId.firstName ?? ''} ${row.lecturerId.lastName ?? ''}`,
                    tone: 'navy',
                  },
                  {
                    id: 'course',
                    header: 'Course',
                    cell: (row) => `${row.courseId.code ?? ''} — ${row.courseId.title ?? ''}`,
                    tone: 'blue',
                  },
                  {
                    id: 'term',
                    header: 'Period',
                    cell: (row) => row.termId.name ?? 'Term',
                    tone: 'teal',
                  },
                  {
                    id: 'role',
                    header: 'Role',
                    cell: (row) => row.assignmentRole.replace('_', ' '),
                    tone: 'violet',
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => <StatusBadge label={row.status} status={row.status} />,
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (row) =>
                      row.status === 'active' ? (
                        <Button
                          className="gap-2 px-3"
                          disabled={deactivateAssignment.isPending}
                          onClick={() => deactivateAssignment.mutate(row._id)}
                          variant="danger"
                        >
                          <Power aria-hidden="true" size={16} />
                          Deactivate
                        </Button>
                      ) : (
                        'Historical'
                      ),
                  },
                ]}
                rowTone={(row) => (row.status === 'active' ? 'blue' : 'gold')}
                rows={assignments.data}
              />
            ) : (
              <EmptyState
                title="No lecturer assignments"
                description="Assign active lecturers to courses for a defined academic period."
              />
            )}
          </div>
        </Card>
      </section>
      <Dialog
        footer={
          <Button disabled={createMapping.isPending} form="mapping-form" type="submit">
            Save mapping
          </Button>
        }
        isOpen={mappingOpen}
        onClose={() => setMappingOpen(false)}
        title="Add curriculum mapping"
      >
        <form className="grid gap-4" id="mapping-form" onSubmit={submitMapping}>
          {select(
            'courseId',
            'Course',
            (courses.data ?? []).map((item) => ({
              id: item._id,
              label: `${item.code} — ${item.title}`,
            })),
          )}
          {select(
            'programmeId',
            'Programme',
            options
              .filter((item) => item.kind === 'programme')
              .map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` })),
          )}
          {select(
            'levelId',
            'Level',
            options
              .filter((item) => item.kind === 'level')
              .map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` })),
          )}
          {select(
            'termId',
            'Term',
            options
              .filter((item) => item.kind === 'term')
              .map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` })),
          )}
          {select('classification', 'Classification', [
            { id: 'core', label: 'Core course' },
            { id: 'elective', label: 'Elective course' },
          ])}
          <MutationFormFeedback
            error={createMapping.error}
            errorFallback="The mapping could not be saved. Verify that it is not a duplicate."
            status={createMapping.isSuccess ? 'success' : createMapping.isError ? 'error' : 'idle'}
            submissionId={createMapping.submittedAt}
            successMessage="The curriculum mapping was saved successfully."
            successTitle="Curriculum mapping saved"
          />
        </form>
      </Dialog>
      <Dialog
        footer={
          <Button disabled={createAssignment.isPending} form="assignment-form" type="submit">
            Save assignment
          </Button>
        }
        isOpen={assignmentOpen}
        onClose={() => setAssignmentOpen(false)}
        title="Assign lecturer"
      >
        <form className="grid gap-4" id="assignment-form" onSubmit={submitAssignment}>
          {select(
            'lecturerId',
            'Lecturer',
            (users.data ?? []).map((item) => ({
              id: item._id,
              label: `${item.firstName} ${item.lastName}`,
            })),
          )}
          {select(
            'courseId',
            'Course',
            (courses.data ?? []).map((item) => ({
              id: item._id,
              label: `${item.code} — ${item.title}`,
            })),
          )}
          {select(
            'academicSessionId',
            'Academic session',
            options
              .filter((item) => item.kind === 'academic_session')
              .map((item) => ({ id: item.id, label: item.name })),
          )}
          {select(
            'termId',
            'Term',
            options
              .filter((item) => item.kind === 'term')
              .map((item) => ({ id: item.id, label: item.name })),
          )}
          {select('assignmentRole', 'Assignment role', [
            { id: 'primary', label: 'Primary lecturer' },
            { id: 'co_lecturer', label: 'Co-lecturer' },
          ])}
          <label className="grid gap-2 text-sm font-medium">
            Starts at
            <input className={selectClass} name="startsAt" required type="datetime-local" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Ends at
            <input className={selectClass} name="endsAt" required type="datetime-local" />
          </label>
          <MutationFormFeedback
            error={createAssignment.error}
            errorFallback="The assignment could not be saved. Check the lecturer, term, and date range."
            status={
              createAssignment.isSuccess ? 'success' : createAssignment.isError ? 'error' : 'idle'
            }
            submissionId={createAssignment.submittedAt}
            successMessage="The lecturer assignment was saved successfully."
            successTitle="Lecturer assignment saved"
          />
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
