import type { AcademicStructureItem, LecturerProfile } from '@qr/types';
import { Badge, Button, Card, CardHeader, Input } from '@qr/ui';
import { BookOpenCheck, BriefcaseBusiness } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ProfilePhotoField } from './profile-photo-field.js';

export interface LecturerProfileValues {
  readonly employeeNumber: string;
  readonly title?: string;
  readonly phone: string;
  readonly campusId?: string;
  readonly facultyId?: string;
  readonly departmentId?: string;
  readonly office?: string;
  readonly biography?: string;
  readonly photoFile?: File;
}

interface Department {
  readonly _id: string;
  readonly code: string;
  readonly name: string;
  readonly facultyName: string;
}

function value(data: FormData, key: string): string | undefined {
  const item = data.get(key);
  const result = typeof item === 'string' ? item.trim() : '';
  return result || undefined;
}

export function LecturerProfileForm({
  assignments,
  departments,
  currentPhotoUrl,
  feedback,
  initial,
  isPending,
  onSubmit,
  phone,
  structures,
}: {
  readonly assignments: readonly Record<string, unknown>[];
  readonly departments: readonly Department[];
  readonly currentPhotoUrl?: string;
  readonly feedback?: ReactNode;
  readonly initial?: LecturerProfile;
  readonly phone?: string;
  readonly structures: readonly AcademicStructureItem[];
  readonly isPending: boolean;
  readonly onSubmit: (values: LecturerProfileValues) => void;
}) {
  const [campusId, setCampusId] = useState(initial?.campusId ?? '');
  const [facultyId, setFacultyId] = useState(initial?.facultyId ?? '');
  const [departmentId, setDepartmentId] = useState(initial?.departmentId ?? '');
  const [photoFile, setPhotoFile] = useState<File>();
  const faculties = useMemo(
    () => structures.filter((item) => item.kind === 'faculty' && item.parent?.id === campusId),
    [campusId, structures],
  );
  const facultyName = structures.find((item) => item.id === facultyId)?.name;
  const availableDepartments = useMemo(
    () => departments.filter((item) => item.facultyName === facultyName),
    [departments, facultyName],
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = value(data, 'title');
    const office = value(data, 'office');
    const biography = value(data, 'biography');
    onSubmit({
      employeeNumber: value(data, 'employeeNumber') ?? '',
      phone: value(data, 'phone') ?? '',
      ...(title ? { title } : {}),
      ...(campusId ? { campusId } : {}),
      ...(facultyId ? { facultyId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(office ? { office } : {}),
      ...(biography ? { biography } : {}),
      ...(photoFile ? { photoFile } : {}),
    });
  };
  const select = (
    name: string,
    label: string,
    options: readonly { readonly id: string; readonly code: string; readonly name: string }[],
    current: string,
    onChange: (value: string) => void,
    emptyMessage: string,
  ) => (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
        disabled={isPending}
        name={name}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={current}
      >
        <option value="">{emptyMessage}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} — {item.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form className="grid gap-6" onSubmit={submit}>
      <Card className="grid gap-5 p-6 sm:grid-cols-2" tone="teal">
        <CardHeader
          className="sm:col-span-2"
          description="Teaching access is assigned by administrators and cannot be self-granted."
          icon={<BriefcaseBusiness size={20} />}
          title="Professional profile"
          tone="teal"
        />
        <Input
          defaultValue={initial?.employeeNumber}
          label="Employee number"
          name="employeeNumber"
          required
        />
        <Input
          defaultValue={initial?.title}
          label="Academic title"
          name="title"
          placeholder="Dr, Professor, Lecturer"
        />
        <Input defaultValue={phone} label="Phone number" name="phone" required type="tel" />
        <Input
          defaultValue={initial?.office}
          label="Office or consultation location"
          name="office"
        />
        {select(
          'campusId',
          'Campus',
          structures.filter((item) => item.kind === 'campus'),
          campusId,
          (nextCampusId) => {
            setCampusId(nextCampusId);
            setFacultyId('');
            setDepartmentId('');
          },
          'Not specified',
        )}
        {select(
          'facultyId',
          'Faculty or school',
          faculties,
          facultyId,
          (nextFacultyId) => {
            setFacultyId(nextFacultyId);
            setDepartmentId('');
          },
          !campusId
            ? 'Select a campus first'
            : faculties.length
              ? 'Not specified'
              : 'No faculties configured for this campus',
        )}
        <label className="grid gap-2 text-sm font-medium">
          Department
          <select
            className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
            disabled={isPending || !facultyId}
            name="departmentId"
            onChange={(event) => setDepartmentId(event.currentTarget.value)}
            value={departmentId}
          >
            <option value="">
              {!facultyId
                ? 'Select a faculty first'
                : availableDepartments.length
                  ? 'Not specified'
                  : 'No departments configured for this faculty'}
            </option>
            {availableDepartments.map((item) => (
              <option key={item._id} value={item._id}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </label>
        <ProfilePhotoField
          {...(currentPhotoUrl ? { currentPhotoUrl } : {})}
          disabled={isPending}
          onChange={setPhotoFile}
        />
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Professional biography
          <textarea
            className="min-h-28 rounded-xl border border-border bg-surface p-3 dark:border-slate-700 dark:bg-dark-surface"
            defaultValue={initial?.biography}
            maxLength={1000}
            minLength={20}
            name="biography"
          />
        </label>
      </Card>
      <Card className="p-6" tone="violet">
        <CardHeader
          description="Read-only assignments for the active academic period."
          icon={<BookOpenCheck size={20} />}
          title="Assigned teaching"
          tone="violet"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {assignments.length ? (
            assignments.map((assignment, index) => (
              <Badge
                key={typeof assignment._id === 'string' ? assignment._id : String(index)}
                tone="success"
              >
                {String((assignment.courseId as { code?: string })?.code ?? 'Assigned course')}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-500">No active teaching assignment.</p>
          )}
        </div>
      </Card>
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="lecturer-profile-actions"
      >
        <div className="min-w-0 flex-1">{feedback}</div>
        <Button disabled={isPending} type="submit">
          {isPending ? 'Saving profile…' : 'Save lecturer profile'}
        </Button>
      </div>
    </form>
  );
}
