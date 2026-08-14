import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  Skeleton,
} from '@qr/ui';
import { useState, type FormEvent } from 'react';
import { UserMinus } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { StatusBadge } from '../../components/status-badge.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';

interface Student {
  readonly _id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
  readonly accountStatus: string;
}

interface Course {
  readonly _id: string;
  readonly code: string;
  readonly title: string;
  readonly status: string;
}

interface RegistrationResponse {
  readonly _id: string;
  readonly registrationNumber: string;
  readonly status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  readonly source: 'core' | 'elective' | 'borrowed' | 'administrator';
  readonly requestedReason?: string;
  readonly reviewNote?: string;
  readonly studentId: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
  } | null;
  readonly courseId: {
    readonly code: string;
    readonly title: string;
  } | null;
}

interface Registration {
  readonly id: string;
  readonly registrationNumber: string;
  readonly status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  readonly source: RegistrationResponse['source'];
  readonly requestedReason?: string;
  readonly reviewNote?: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly courseCode: string;
  readonly courseTitle: string;
}

interface Envelope<T> {
  readonly data: T;
}

const managementRoles = new Set(['super_admin', 'university_admin']);
const viewingRoles = new Set([
  'super_admin',
  'university_admin',
  'faculty_admin',
  'department_admin',
]);

function formValue(values: FormData, key: string): string {
  const value = values.get(key);
  return typeof value === 'string' ? value : '';
}

export default function RegistrationManagementPage() {
  const { notify } = useDashboardToast();
  const user = useAuthStore((state) => state.user);
  const client = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewing, setReviewing] = useState<{
    readonly registration: Registration;
    readonly decision: 'approve' | 'reject';
  } | null>(null);
  const canManage = user ? managementRoles.has(user.role) : false;
  const canView = user ? viewingRoles.has(user.role) : false;

  const registrations = useQuery({
    queryKey: ['registrations'],
    enabled: canView,
    queryFn: async () => {
      const response =
        await apiClient.get<Envelope<readonly RegistrationResponse[]>>('/registrations');
      return response.data.data.map((registration): Registration => ({
        id: registration._id,
        registrationNumber: registration.registrationNumber,
        status: registration.status,
        source: registration.source,
        ...(registration.requestedReason ? { requestedReason: registration.requestedReason } : {}),
        ...(registration.reviewNote ? { reviewNote: registration.reviewNote } : {}),
        studentName: registration.studentId
          ? `${registration.studentId.firstName} ${registration.studentId.lastName}`
          : 'Unavailable student',
        studentEmail: registration.studentId?.email ?? '',
        courseCode: registration.courseId?.code ?? 'Unavailable',
        courseTitle: registration.courseId?.title ?? '',
      }));
    },
  });

  const students = useQuery({
    queryKey: ['users', 'students'],
    enabled: canManage && dialogOpen,
    queryFn: async () => {
      const response = await apiClient.get<Envelope<readonly Student[]>>('/users');
      return response.data.data.filter(
        (student) => student.role === 'student' && student.accountStatus === 'active',
      );
    },
  });

  const courses = useQuery({
    queryKey: ['academic', 'courses'],
    enabled: canManage && dialogOpen,
    queryFn: async () => {
      const response = await apiClient.get<Envelope<readonly Course[]>>('/academic/courses');
      return response.data.data.filter((course) => course.status !== 'inactive');
    },
  });

  const createRegistration = useMutation({
    mutationFn: async (body: {
      readonly studentId: string;
      readonly courseId: string;
      readonly registrationNumber: string;
    }) => apiClient.post('/registrations', body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['registrations'] });
      setDialogOpen(false);
      notify({
        tone: 'success',
        title: 'Registration created',
        message: 'The student registration was created successfully.',
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      readonly id: string;
      readonly status: 'approved' | 'withdrawn';
    }) => apiClient.patch(`/registrations/${id}`, { status }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['registrations'] });
      await client.invalidateQueries({ queryKey: ['registrations', 'mine'] });
    },
  });
  const reviewBorrowed = useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      readonly id: string;
      readonly decision: 'approve' | 'reject';
      readonly note: string;
    }) => apiClient.post(`/registrations/borrowed/${id}/review`, { decision, note }),
    onSuccess: async () => {
      setReviewing(null);
      await client.invalidateQueries({ queryKey: ['registrations'] });
      notify({
        tone: 'success',
        title: 'Request reviewed',
        message: 'The borrowed-course request was reviewed successfully.',
      });
    },
  });

  if (!user)
    return (
      <DashboardLayout>
        <ErrorState
          title="Your session has ended"
          description="Sign in to manage course registrations."
        />
      </DashboardLayout>
    );

  if (!canView)
    return (
      <DashboardLayout>
        <ErrorState
          title="Access restricted"
          description="Course registration management is not assigned to your role."
        />
      </DashboardLayout>
    );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    createRegistration.mutate({
      studentId: formValue(values, 'studentId'),
      courseId: formValue(values, 'courseId'),
      registrationNumber: formValue(values, 'registrationNumber'),
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Academic enrolment</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Course registrations</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Review and approve student access to registered courses.
          </p>
        </div>
        {canManage ? <Button onClick={() => setDialogOpen(true)}>Register student</Button> : null}
      </div>

      <section className="mt-8">
        {registrations.isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : registrations.isError ? (
          <ErrorState
            title="Unable to load registrations"
            description="Please retry your request."
            retry={() => void registrations.refetch()}
          />
        ) : registrations.data?.length ? (
          <DataTable
            caption="Course registrations"
            columns={[
              {
                id: 'student',
                header: 'Student',
                cell: (row) => (
                  <div>
                    <p className="font-medium">{row.studentName}</p>
                    <p className="text-xs text-slate-500">{row.studentEmail}</p>
                  </div>
                ),
                tone: 'navy',
              },
              {
                id: 'number',
                header: 'Registration number',
                cell: (row) => (
                  <IdentifierBadge tone="violet">{row.registrationNumber}</IdentifierBadge>
                ),
              },
              {
                id: 'course',
                header: 'Course',
                cell: (row) => (
                  <div>
                    <IdentifierBadge tone="blue">{row.courseCode}</IdentifierBadge>
                    <p className="text-xs text-slate-500">{row.courseTitle}</p>
                  </div>
                ),
              },
              {
                id: 'status',
                header: 'Status',
                cell: (row) => <StatusBadge label={row.status} status={row.status} />,
              },
              {
                id: 'source',
                header: 'Source',
                cell: (row) => (
                  <div>
                    <p className="font-medium capitalize">{row.source}</p>
                    {row.requestedReason ? (
                      <p className="max-w-xs text-xs text-slate-500">{row.requestedReason}</p>
                    ) : null}
                  </div>
                ),
                tone: 'teal',
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (row) =>
                  canManage ? (
                    <div className="flex flex-wrap gap-2">
                      {row.source === 'borrowed' && row.status === 'pending' ? (
                        <>
                          <Button
                            disabled={reviewBorrowed.isPending}
                            onClick={() => setReviewing({ registration: row, decision: 'approve' })}
                            variant="secondary"
                          >
                            Approve request
                          </Button>
                          <Button
                            disabled={reviewBorrowed.isPending}
                            onClick={() => setReviewing({ registration: row, decision: 'reject' })}
                            variant="danger"
                          >
                            Reject request
                          </Button>
                        </>
                      ) : null}
                      {row.source !== 'borrowed' && row.status !== 'approved' ? (
                        <Button
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: row.id, status: 'approved' })}
                          variant="secondary"
                        >
                          Approve
                        </Button>
                      ) : null}
                      {row.source !== 'borrowed' && row.status !== 'withdrawn' ? (
                        <Button
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: row.id, status: 'withdrawn' })}
                          variant="danger"
                        >
                          <UserMinus aria-hidden="true" size={16} /> Withdraw
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    'Read only'
                  ),
              },
            ]}
            rowTone={(row) =>
              row.status === 'approved'
                ? 'green'
                : row.status === 'rejected' || row.status === 'withdrawn'
                  ? 'rose'
                  : 'gold'
            }
            rows={registrations.data}
          />
        ) : (
          <EmptyState
            title="No registrations yet"
            description="Course registrations created for students will appear here."
          />
        )}
        <div className="mt-4">
          <MutationFormFeedback
            error={updateStatus.error}
            errorFallback="The registration could not be updated. Please retry."
            status={updateStatus.isSuccess ? 'success' : updateStatus.isError ? 'error' : 'idle'}
            submissionId={updateStatus.submittedAt}
            successMessage="The registration status was updated successfully."
            successTitle="Registration updated"
          />
        </div>
      </section>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Register student"
        footer={
          <Button
            disabled={createRegistration.isPending || students.isLoading || courses.isLoading}
            form="registration-create"
            type="submit"
          >
            Create registration
          </Button>
        }
      >
        <form className="grid gap-4" id="registration-create" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Student
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-slate-900 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100"
              name="studentId"
              required
            >
              <option value="">Select active student</option>
              {students.data?.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.firstName} {student.lastName} — {student.email}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Course
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-slate-900 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100"
              name="courseId"
              required
            >
              <option value="">Select active course</option>
              {courses.data?.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Registration number
            <input
              className="h-11 rounded-xl border border-border bg-surface px-3 text-slate-900 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100"
              maxLength={40}
              minLength={2}
              name="registrationNumber"
              required
            />
          </label>
          <MutationFormFeedback
            error={createRegistration.error}
            errorFallback="The registration could not be created. Check for a duplicate and try again."
            status={
              createRegistration.isSuccess
                ? 'success'
                : createRegistration.isError
                  ? 'error'
                  : 'idle'
            }
            submissionId={createRegistration.submittedAt}
            successMessage="The student registration was created successfully."
            successTitle="Registration created"
          />
        </form>
      </Dialog>
      <Dialog
        footer={
          <Button disabled={reviewBorrowed.isPending} form="borrowed-review-form" type="submit">
            Confirm {reviewing?.decision ?? 'review'}
          </Button>
        }
        isOpen={reviewing !== null}
        onClose={() => setReviewing(null)}
        title={`${reviewing?.decision === 'reject' ? 'Reject' : 'Approve'} borrowed-course request`}
      >
        <form
          className="grid gap-4"
          id="borrowed-review-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!reviewing) return;
            const data = new FormData(event.currentTarget);
            const note = data.get('note');
            reviewBorrowed.mutate({
              id: reviewing.registration.id,
              decision: reviewing.decision,
              note: typeof note === 'string' ? note.trim() : '',
            });
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {reviewing?.registration.studentName} requested {reviewing?.registration.courseCode}.
            The decision is audit logged and visible to the student.
          </p>
          <label className="grid gap-2 text-sm font-medium">
            Decision note
            <textarea
              className="min-h-28 rounded-xl border border-border bg-surface p-3 text-slate-900 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100"
              minLength={10}
              name="note"
              required
            />
          </label>
          <MutationFormFeedback
            error={reviewBorrowed.error}
            errorFallback="The request could not be reviewed. It may already have changed state."
            status={
              reviewBorrowed.isSuccess ? 'success' : reviewBorrowed.isError ? 'error' : 'idle'
            }
            submissionId={reviewBorrowed.submittedAt}
            successMessage="The borrowed-course request was reviewed successfully."
            successTitle="Request reviewed"
          />
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
