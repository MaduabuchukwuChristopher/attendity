import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  Input,
  PercentageValue,
  Skeleton,
} from '@qr/ui';
import { BookOpenCheck, Building2, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { dashboardFormControlClassName } from '../../components/dashboard-form-control.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';

type EntityType = 'departments' | 'courses';
interface Department {
  readonly _id: string;
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly facultyName: string;
}
interface Course {
  readonly _id: string;
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly creditUnits: number;
  readonly attendanceRequirement: number;
  readonly lecturerId: {
    readonly _id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
  } | null;
}
interface Lecturer {
  readonly _id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
  readonly accountStatus: string;
}
interface Envelope<T> {
  readonly data: T;
}
const endpoint = (type: EntityType) => `/academic/${type}`;

export default function AcademicManagementPage({ type }: { readonly type: EntityType }) {
  const { notify } = useDashboardToast();
  const user = useAuthStore((state) => state.user);
  const client = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const canManage = user?.role === 'super_admin' || user?.role === 'university_admin';
  const query = useQuery({
    queryKey: ['academic', type],
    enabled: user !== null,
    queryFn: async () => {
      const records = (
        await apiClient.get<Envelope<readonly (Department | Course)[]>>(endpoint(type))
      ).data.data;
      return records.map((record) => ({ ...record, id: record._id }));
    },
  });
  const departments = useQuery({
    queryKey: ['academic', 'departments'],
    enabled: user !== null && type === 'courses',
    queryFn: async () => {
      const records = (
        await apiClient.get<Envelope<readonly Department[]>>('/academic/departments')
      ).data.data;
      return records.map((record) => ({ ...record, id: record._id }));
    },
  });
  const lecturers = useQuery({
    queryKey: ['users', 'lecturers'],
    enabled: canManage && type === 'courses',
    queryFn: async () => {
      const records = (await apiClient.get<Envelope<readonly Lecturer[]>>('/users')).data.data;
      return records.filter(
        (record) => record.role === 'lecturer' && record.accountStatus === 'active',
      );
    },
  });
  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => apiClient.post(endpoint(type), body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['academic', type] });
      setDialogOpen(false);
      notify({
        tone: 'success',
        title: type === 'courses' ? 'Course created' : 'Department created',
        message: `The ${type === 'courses' ? 'course' : 'department'} was created successfully.`,
      });
    },
  });
  const assignLecturer = useMutation({
    mutationFn: async ({ courseId, lecturerId }: { courseId: string; lecturerId: string }) =>
      apiClient.patch(`/academic/courses/${courseId}/lecturer`, { lecturerId }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['academic', 'courses'] }),
  });
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState
          title="Your session has ended"
          description="Sign in to manage academic records."
        />
      </DashboardLayout>
    );
  const title = type === 'departments' ? 'Departments' : 'Courses';
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (type === 'departments')
      create.mutate({
        code: values.get('code'),
        name: values.get('name'),
        facultyName: values.get('facultyName'),
      });
    else {
      const lecturerId = values.get('lecturerId');
      create.mutate({
        code: values.get('code'),
        title: values.get('title'),
        creditUnits: Number(values.get('creditUnits')),
        departmentId: values.get('departmentId'),
        attendanceRequirement: Number(values.get('attendanceRequirement')),
        ...(typeof lecturerId === 'string' && lecturerId ? { lecturerId } : {}),
      });
    }
  };
  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Academic structure</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight">
            {type === 'courses' ? (
              <BookOpenCheck className="text-blue-700 dark:text-blue-300" size={28} />
            ) : (
              <Building2 className="text-emerald-700 dark:text-emerald-300" size={28} />
            )}
            {title}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Manage institution-owned {title.toLowerCase()} with full access controls.
          </p>
        </div>
        {canManage ? (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden="true" size={17} />
            Create {type === 'departments' ? 'department' : 'course'}
          </Button>
        ) : null}
      </div>
      <section className="mt-8">
        {query.isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : query.isError ? (
          <ErrorState
            title={`Unable to load ${title.toLowerCase()}`}
            description="Please retry your request."
            retry={() => void query.refetch()}
          />
        ) : query.data?.length ? (
          <DataTable
            caption={`${title} management`}
            columns={
              type === 'departments'
                ? [
                    {
                      id: 'code',
                      header: 'Code',
                      cell: (row) => (
                        <IdentifierBadge tone="green">{(row as Department).code}</IdentifierBadge>
                      ),
                    },
                    {
                      id: 'name',
                      header: 'Department',
                      cell: (row) => (row as Department).name,
                      tone: 'navy' as const,
                    },
                    {
                      id: 'faculty',
                      header: 'Faculty',
                      cell: (row) => (row as Department).facultyName,
                      tone: 'violet' as const,
                    },
                  ]
                : [
                    {
                      id: 'code',
                      header: 'Code',
                      cell: (row) => (
                        <IdentifierBadge tone="blue">{(row as Course).code}</IdentifierBadge>
                      ),
                    },
                    {
                      id: 'title',
                      header: 'Course title',
                      cell: (row) => (row as Course).title,
                      tone: 'navy' as const,
                    },
                    {
                      id: 'units',
                      header: 'Units',
                      cell: (row) => <Badge tone="neutral">{(row as Course).creditUnits}</Badge>,
                    },
                    {
                      id: 'requirement',
                      header: 'Requirement',
                      cell: (row) => (
                        <PercentageValue value={(row as Course).attendanceRequirement} />
                      ),
                    },
                    {
                      id: 'lecturer',
                      header: 'Lecturer',
                      cell: (row) => {
                        const course = row as Course;
                        return canManage ? (
                          <select
                            aria-label={`Lecturer for ${course.code}`}
                            className={`${dashboardFormControlClassName} h-9 px-2 text-sm`}
                            disabled={assignLecturer.isPending}
                            onChange={(event) => {
                              if (event.target.value)
                                assignLecturer.mutate({
                                  courseId: course.id,
                                  lecturerId: event.target.value,
                                });
                            }}
                            value={course.lecturerId?._id ?? ''}
                          >
                            <option value="">Unassigned</option>
                            {lecturers.data?.map((lecturer) => (
                              <option key={lecturer._id} value={lecturer._id}>
                                {lecturer.firstName} {lecturer.lastName}
                              </option>
                            ))}
                          </select>
                        ) : course.lecturerId ? (
                          `${course.lecturerId.firstName} ${course.lecturerId.lastName}`
                        ) : (
                          'Unassigned'
                        );
                      },
                      tone: 'teal' as const,
                    },
                  ]
            }
            rows={query.data}
            rowTone={(_row, index) =>
              type === 'departments'
                ? index % 2 === 0
                  ? 'green'
                  : 'gold'
                : index % 2 === 0
                  ? 'blue'
                  : 'violet'
            }
          />
        ) : (
          <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            description={`No ${title.toLowerCase()} are currently available for this institution.`}
          />
        )}
      </section>
      <div className="mt-4">
        <MutationFormFeedback
          error={assignLecturer.error}
          errorFallback="The lecturer assignment could not be saved. Please retry."
          status={assignLecturer.isSuccess ? 'success' : assignLecturer.isError ? 'error' : 'idle'}
          submissionId={assignLecturer.submittedAt}
          successMessage="The lecturer assignment was saved successfully."
          successTitle="Assignment saved"
        />
      </div>
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={`Create ${type === 'departments' ? 'department' : 'course'}`}
        footer={
          <Button form="academic-create" disabled={create.isPending} type="submit">
            Save
          </Button>
        }
      >
        <form className="grid gap-4" id="academic-create" onSubmit={onSubmit}>
          <Input
            label={type === 'departments' ? 'Department code' : 'Course code'}
            name="code"
            required
          />
          {type === 'departments' ? (
            <>
              <Input label="Department name" name="name" required />
              <Input label="Faculty name" name="facultyName" required />
            </>
          ) : (
            <>
              <Input label="Course title" name="title" required />
              <Input
                label="Credit units"
                min="1"
                max="12"
                name="creditUnits"
                required
                type="number"
              />
              <Input
                label="Attendance requirement (%)"
                min="0"
                max="100"
                name="attendanceRequirement"
                required
                type="number"
                defaultValue="75"
              />
              <label className="grid gap-2 text-sm font-medium">
                Department
                <select
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-slate-900 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100"
                  name="departmentId"
                  required
                >
                  <option value="">Select department</option>
                  {departments.data?.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.code} — {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Lecturer
                <select
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-slate-900 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100"
                  name="lecturerId"
                >
                  <option value="">Assign later</option>
                  {lecturers.data?.map((lecturer) => (
                    <option key={lecturer._id} value={lecturer._id}>
                      {lecturer.firstName} {lecturer.lastName} — {lecturer.email}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <MutationFormFeedback
            error={create.error}
            errorFallback={`The ${type === 'departments' ? 'department' : 'course'} could not be created. Review the details and try again.`}
            status={create.isSuccess ? 'success' : create.isError ? 'error' : 'idle'}
            submissionId={create.submittedAt}
            successMessage={`The ${type === 'departments' ? 'department' : 'course'} was created successfully.`}
            successTitle="Academic record created"
          />
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
