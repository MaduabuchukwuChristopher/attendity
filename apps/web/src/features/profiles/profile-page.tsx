import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcademicStructureItem, ApiResponse, StudentProfile } from '@qr/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  Input,
  Skeleton,
} from '@qr/ui';
import { BookOpen, BookPlus, ClipboardList, ShieldCheck, UserCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { FormActionFeedback } from '../../components/form-action-feedback.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';
import { StatusBadge } from '../../components/status-badge.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { useInstitutionSettings } from '../settings/use-institution-settings.js';
import { apiErrorMessage } from '../auth/auth-utils.js';
import { LecturerProfileForm, type LecturerProfileValues } from './lecturer-profile-form.js';
import {
  StudentProfileForm,
  type ProfileDepartment,
  type StudentProfileValues,
} from './student-profile-form.js';
import { useProfile, useSaveProfile } from './use-profile.js';

interface CourseRecord {
  readonly _id: string;
  readonly code: string;
  readonly title: string;
}
interface ProfileOptions {
  readonly structures: readonly AcademicStructureItem[];
  readonly departments: readonly ProfileDepartment[];
  readonly courses: readonly CourseRecord[];
}
interface MappingRecord {
  readonly _id: string;
  readonly classification: 'core' | 'elective';
  readonly courseId: CourseRecord;
  readonly termId: { readonly name?: string };
}
interface RegistrationRecord {
  readonly _id: string;
  readonly status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  readonly source: 'core' | 'elective' | 'borrowed' | 'administrator';
  readonly requestedReason?: string;
  readonly reviewNote?: string;
  readonly courseId: CourseRecord;
}

function CourseRegistrationPanel({
  courses,
  enabled,
}: {
  readonly courses: readonly CourseRecord[];
  readonly enabled: boolean;
}) {
  const client = useQueryClient();
  const [borrowedCourseId, setBorrowedCourseId] = useState('');
  const recommendations = useQuery({
    queryKey: ['registrations', 'recommendations'],
    enabled,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly MappingRecord[]>>('/registrations/recommendations'))
        .data.data,
  });
  const registrations = useQuery({
    queryKey: ['registrations', 'mine'],
    enabled,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly RegistrationRecord[]>>('/registrations/mine')).data
        .data,
  });
  const refresh = async () => client.invalidateQueries({ queryKey: ['registrations'] });
  const action = useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string;
      method: 'post' | 'delete';
      body?: Record<string, string>;
    }) => (method === 'delete' ? apiClient.delete(path) : apiClient.post(path, body)),
    onSuccess: refresh,
  });
  const submitBorrowed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reason = data.get('reason');
    action.mutate({
      path: '/registrations/borrowed',
      method: 'post',
      body: { courseId: borrowedCourseId, reason: typeof reason === 'string' ? reason.trim() : '' },
    });
  };
  const registeredCourseIds = new Set(registrations.data?.map((item) => item.courseId?._id));
  const borrowable = courses.filter((course) => !registeredCourseIds.has(course._id));
  if (!enabled)
    return (
      <Card className="p-6">
        <EmptyState
          title="Complete your academic profile"
          description="Your core and elective curriculum preview will appear after the required academic placement is saved."
        />
      </Card>
    );
  return (
    <div className="grid gap-6">
      <Card className="p-6" tone="green">
        <CardHeader
          description="Core courses are added automatically. Electives follow institution approval policy."
          icon={<BookOpen size={20} />}
          title="Curriculum recommendations"
          tone="green"
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {recommendations.data?.map((item) => (
            <div
              className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100/90 to-blue-100/70 p-4 dark:border-emerald-800 dark:from-emerald-950/70 dark:to-blue-950/60"
              key={item._id}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <IdentifierBadge tone="teal">{item.courseId.code}</IdentifierBadge>
                  <p className="text-sm text-slate-500">{item.courseId.title}</p>
                </div>
                <Badge tone={item.classification === 'core' ? 'success' : 'info'}>
                  {item.classification}
                </Badge>
              </div>
              {item.classification === 'elective' && !registeredCourseIds.has(item.courseId._id) ? (
                <Button
                  className="mt-4"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate({
                      path: '/registrations/electives',
                      method: 'post',
                      body: { courseId: item.courseId._id },
                    })
                  }
                  variant="secondary"
                >
                  Select elective
                </Button>
              ) : null}
            </div>
          )) ?? (
            <p className="text-sm text-slate-500">
              No active recommendations for the current period.
            </p>
          )}
        </div>
      </Card>
      <Card className="p-6" tone="blue">
        <CardHeader
          description="Approved, pending, and requested courses in your academic record."
          icon={<ClipboardList size={20} />}
          title="My course registrations"
          tone="blue"
        />
        <div className="mt-4">
          {registrations.data?.length ? (
            <DataTable
              caption="My course registrations"
              columns={[
                {
                  id: 'course',
                  header: 'Course',
                  cell: (row) => `${row.courseId?.code ?? 'Course'} — ${row.courseId?.title ?? ''}`,
                  tone: 'blue',
                },
                { id: 'source', header: 'Source', cell: (row) => row.source, tone: 'teal' },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => <StatusBadge label={row.status} status={row.status} />,
                },
                {
                  id: 'action',
                  header: 'Action',
                  cell: (row) =>
                    row.source === 'elective' && ['pending', 'approved'].includes(row.status) ? (
                      <Button
                        onClick={() =>
                          action.mutate({
                            path: `/registrations/electives/${row._id}`,
                            method: 'delete',
                          })
                        }
                        variant="ghost"
                      >
                        Withdraw elective
                      </Button>
                    ) : row.source === 'borrowed' &&
                      ['pending', 'approved'].includes(row.status) ? (
                      <Button
                        onClick={() =>
                          action.mutate({
                            path: `/registrations/borrowed/${row._id}/withdraw`,
                            method: 'post',
                          })
                        }
                        variant="ghost"
                      >
                        Withdraw request
                      </Button>
                    ) : row.source === 'borrowed' &&
                      ['rejected', 'withdrawn'].includes(row.status) ? (
                      <Button
                        onClick={() =>
                          action.mutate({
                            path: `/registrations/borrowed/${row._id}/resubmit`,
                            method: 'post',
                            body: {},
                          })
                        }
                        variant="secondary"
                      >
                        Resubmit
                      </Button>
                    ) : (
                      '—'
                    ),
                },
              ]}
              rows={registrations.data}
              rowTone={(row) =>
                row.status === 'approved' ? 'green' : row.status === 'pending' ? 'gold' : 'rose'
              }
            />
          ) : (
            <EmptyState
              title="No registrations"
              description="Core registrations will be reconciled from the active curriculum."
            />
          )}
        </div>
      </Card>
      <Card className="p-6" tone="violet">
        <CardHeader
          description="Borrowed courses require administrator review and never replace assigned core courses."
          icon={<BookPlus size={20} />}
          title="Request a borrowed course"
          tone="violet"
        />
        <form
          className="mt-5 grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
          onSubmit={submitBorrowed}
        >
          <label className="grid gap-2 text-sm font-medium">
            Course
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) => setBorrowedCourseId(event.currentTarget.value)}
              required
              value={borrowedCourseId}
            >
              <option value="">Select course</option>
              {borrowable.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </label>
          <Input label="Academic reason" minLength={20} name="reason" required />
          <Button disabled={action.isPending} type="submit">
            Submit request
          </Button>
        </form>
        {action.isError ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            The course request could not be completed. Review its current state and retry.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const { notify } = useDashboardToast();
  const profile = useProfile();
  const settings = useInstitutionSettings(Boolean(user));
  const saveStudent = useSaveProfile('student');
  const saveLecturer = useSaveProfile('lecturer');
  const options = useQuery({
    queryKey: ['profile', 'options'],
    enabled: Boolean(user && ['student', 'lecturer'].includes(user.role)),
    queryFn: async () =>
      (await apiClient.get<ApiResponse<ProfileOptions>>('/profiles/options')).data.data,
  });
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to manage your profile." />
      </DashboardLayout>
    );
  if (profile.isLoading || settings.isLoading || options.isLoading)
    return (
      <DashboardLayout>
        <Skeleton className="h-[36rem]" />
      </DashboardLayout>
    );
  if (profile.isError || !profile.data || !settings.data)
    return (
      <DashboardLayout>
        <ErrorState
          title="Unable to load your profile"
          description="Please retry the request."
          retry={() => void profile.refetch()}
        />
      </DashboardLayout>
    );
  const studentProfile =
    user.role === 'student' ? (profile.data.profile as StudentProfile | null) : null;
  const lecturerProfile = user.role === 'lecturer' ? profile.data.profile : null;
  return (
    <DashboardLayout>
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-primary dark:bg-emerald-950">
          <UserCircle size={28} />
        </span>
        <div>
          <p className="text-sm font-semibold text-primary">Personal workspace</p>
          <h1 className="text-3xl font-bold">My profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Keep your verified identity and role-specific information current.
          </p>
        </div>
      </div>
      <div className="mt-8 grid gap-8">
        {user.role === 'student' ? (
          <>
            <StudentProfileForm
              {...(profile.data.user.photoUrl
                ? { currentPhotoUrl: profile.data.user.photoUrl }
                : {})}
              departments={options.data?.departments ?? []}
              feedback={
                <FormActionFeedback
                  message={
                    saveStudent.isSuccess
                      ? 'Profile and photograph saved successfully.'
                      : saveStudent.isError
                        ? apiErrorMessage(
                            saveStudent.error,
                            'The profile could not be saved. Verify the institution-specific fields and retry.',
                          )
                        : undefined
                  }
                  status={
                    saveStudent.isSuccess ? 'success' : saveStudent.isError ? 'error' : 'idle'
                  }
                />
              }
              identifier={{
                label: settings.data.studentIdentifierLabel,
                example: settings.data.studentIdentifierExample,
                pattern: settings.data.studentIdentifierPattern,
                guidance: settings.data.studentIdentifierGuidance,
              }}
              initial={
                studentProfile
                  ? { ...studentProfile, phone: profile.data.user.phone ?? '' }
                  : { phone: profile.data.user.phone ?? '' }
              }
              isPending={saveStudent.isPending}
              key={profile.data.user.photoUrl ?? 'student-profile'}
              onSubmit={(values: StudentProfileValues) =>
                saveStudent.mutate(values, {
                  onSuccess: () =>
                    notify({
                      tone: 'success',
                      title: 'Profile saved',
                      message: 'Your profile and photograph are now up to date.',
                    }),
                  onError: (error) =>
                    notify({
                      tone: 'error',
                      title: 'Profile not saved',
                      message: apiErrorMessage(
                        error,
                        'Verify the institution-specific fields and retry.',
                      ),
                    }),
                })
              }
              structures={options.data?.structures ?? []}
            />
            <CourseRegistrationPanel
              courses={options.data?.courses ?? []}
              enabled={Boolean(studentProfile)}
            />
          </>
        ) : user.role === 'lecturer' ? (
          <>
            <LecturerProfileForm
              assignments={profile.data.assignments ?? []}
              {...(profile.data.user.photoUrl
                ? { currentPhotoUrl: profile.data.user.photoUrl }
                : {})}
              departments={options.data?.departments ?? []}
              feedback={
                <FormActionFeedback
                  message={
                    saveLecturer.isSuccess
                      ? 'Profile and photograph saved successfully.'
                      : saveLecturer.isError
                        ? apiErrorMessage(
                            saveLecturer.error,
                            'The profile could not be saved. Verify the professional fields and retry.',
                          )
                        : undefined
                  }
                  status={
                    saveLecturer.isSuccess ? 'success' : saveLecturer.isError ? 'error' : 'idle'
                  }
                />
              }
              {...(lecturerProfile ? { initial: lecturerProfile } : {})}
              isPending={saveLecturer.isPending}
              key={profile.data.user.photoUrl ?? 'lecturer-profile'}
              onSubmit={(values: LecturerProfileValues) =>
                saveLecturer.mutate(values, {
                  onSuccess: () =>
                    notify({
                      tone: 'success',
                      title: 'Profile saved',
                      message: 'Your professional profile and photograph are now up to date.',
                    }),
                  onError: (error) =>
                    notify({
                      tone: 'error',
                      title: 'Profile not saved',
                      message: apiErrorMessage(
                        error,
                        'Verify the professional profile fields and retry.',
                      ),
                    }),
                })
              }
              {...(profile.data.user.phone ? { phone: profile.data.user.phone } : {})}
              structures={options.data?.structures ?? []}
            />
          </>
        ) : (
          <Card className="p-6" tone="navy">
            <CardHeader
              description="Your administrative identity is managed from Account and Security. Academic profile fields apply to students and lecturers."
              icon={<ShieldCheck size={20} />}
              title="Account profile"
              tone="navy"
            />
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
