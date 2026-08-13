import type { AcademicStructureItem } from '@qr/types';
import { Button, Card, CardHeader, Input } from '@qr/ui';
import { GraduationCap, UserRound } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ProfilePhotoField } from './profile-photo-field.js';

export interface ProfileDepartment {
  readonly _id: string;
  readonly code: string;
  readonly name: string;
  readonly facultyName: string;
}

export interface StudentProfileValues {
  readonly matricNumber: string;
  readonly phone: string;
  readonly campusId: string;
  readonly facultyId: string;
  readonly departmentId: string;
  readonly programmeId: string;
  readonly levelId: string;
  readonly admissionSessionId: string;
  readonly photoFile?: File;
}

interface StudentProfileFormProps {
  readonly identifier: {
    readonly label: string;
    readonly example: string;
    readonly pattern: string;
    readonly guidance: string;
  };
  readonly structures: readonly AcademicStructureItem[];
  readonly departments: readonly ProfileDepartment[];
  readonly initial?: Partial<StudentProfileValues>;
  readonly currentPhotoUrl?: string;
  readonly isPending?: boolean;
  readonly feedback?: ReactNode;
  readonly onSubmit: (values: StudentProfileValues) => void;
}

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function StudentProfileForm({
  currentPhotoUrl,
  departments,
  feedback,
  identifier,
  initial = {},
  isPending = false,
  onSubmit,
  structures,
}: StudentProfileFormProps) {
  const [campusId, setCampusId] = useState(initial.campusId ?? '');
  const [facultyId, setFacultyId] = useState(initial.facultyId ?? '');
  const [departmentId, setDepartmentId] = useState(initial.departmentId ?? '');
  const [programmeId, setProgrammeId] = useState(initial.programmeId ?? '');
  const [levelId, setLevelId] = useState(initial.levelId ?? '');
  const [admissionSessionId, setAdmissionSessionId] = useState(initial.admissionSessionId ?? '');
  const [photoFile, setPhotoFile] = useState<File>();
  const faculties = useMemo(
    () => structures.filter((item) => item.kind === 'faculty' && item.parent?.id === campusId),
    [campusId, structures],
  );
  const programmes = useMemo(
    () => structures.filter((item) => item.kind === 'programme' && item.parent?.id === facultyId),
    [facultyId, structures],
  );
  const levels = useMemo(
    () => structures.filter((item) => item.kind === 'level' && item.parent?.id === programmeId),
    [programmeId, structures],
  );
  const facultyName = structures.find((item) => item.id === facultyId)?.name;
  const availableDepartments = useMemo(
    () => departments.filter((item) => !facultyName || item.facultyName === facultyName),
    [departments, facultyName],
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      matricNumber: text(data, 'matricNumber'),
      phone: text(data, 'phone'),
      campusId,
      facultyId,
      departmentId,
      programmeId,
      levelId,
      admissionSessionId,
      ...(photoFile ? { photoFile } : {}),
    });
  };
  const selector = (
    name: keyof StudentProfileValues,
    label: string,
    options: readonly { readonly id: string; readonly code?: string; readonly name: string }[],
    value: string,
    onChange?: (value: string) => void,
    emptyMessage = `Select ${label.toLowerCase()}`,
  ) => (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className={selectClass}
        disabled={isPending}
        name={name}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        required
        value={value}
      >
        <option value="">{emptyMessage}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code ? `${item.code} — ` : ''}
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form className="grid gap-6" onSubmit={submit}>
      <Card className="grid gap-5 p-6 sm:grid-cols-2" tone="blue">
        <CardHeader
          className="sm:col-span-2"
          description="Use the academic identity issued by your institution."
          icon={<UserRound size={20} />}
          title="Identity and contact"
          tone="blue"
        />
        <Input
          defaultValue={initial.matricNumber}
          label={identifier.label}
          name="matricNumber"
          pattern={identifier.pattern}
          placeholder={identifier.example}
          required
        />
        <Input defaultValue={initial.phone} label="Phone number" name="phone" required type="tel" />
        <p className="-mt-3 text-xs text-slate-500 sm:col-span-2">{identifier.guidance}</p>
        <ProfilePhotoField
          {...(currentPhotoUrl ? { currentPhotoUrl } : {})}
          disabled={isPending}
          onChange={setPhotoFile}
        />
      </Card>
      <Card className="grid gap-5 p-6 sm:grid-cols-2" tone="violet">
        <CardHeader
          className="sm:col-span-2"
          description="Selections are validated from campus through programme and level."
          icon={<GraduationCap size={20} />}
          title="Academic placement"
          tone="violet"
        />
        {selector(
          'campusId',
          'Campus',
          structures.filter((item) => item.kind === 'campus'),
          campusId,
          (value) => {
            setCampusId(value);
            setFacultyId('');
            setDepartmentId('');
            setProgrammeId('');
            setLevelId('');
          },
        )}
        {selector(
          'facultyId',
          'Faculty or school',
          faculties,
          facultyId,
          (value) => {
            setFacultyId(value);
            setDepartmentId('');
            setProgrammeId('');
            setLevelId('');
          },
          !campusId
            ? 'Select a campus first'
            : faculties.length
              ? 'Select faculty or school'
              : 'No faculties configured for this campus',
        )}
        <label className="grid gap-2 text-sm font-medium">
          Department
          <select
            className={selectClass}
            disabled={isPending || !facultyId}
            name="departmentId"
            onChange={(event) => setDepartmentId(event.currentTarget.value)}
            required
            value={departmentId}
          >
            <option value="">
              {!facultyId
                ? 'Select a faculty first'
                : availableDepartments.length
                  ? 'Select department'
                  : 'No departments configured for this faculty'}
            </option>
            {availableDepartments.map((item) => (
              <option key={item._id} value={item._id}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </label>
        {selector(
          'programmeId',
          'Programme',
          programmes,
          programmeId,
          (value) => {
            setProgrammeId(value);
            setLevelId('');
          },
          !facultyId
            ? 'Select a faculty first'
            : programmes.length
              ? 'Select programme'
              : 'No programmes configured for this faculty',
        )}
        {selector(
          'levelId',
          'Level',
          levels,
          levelId,
          setLevelId,
          !programmeId
            ? 'Select a programme first'
            : levels.length
              ? 'Select level'
              : 'No levels configured for this programme',
        )}
        {selector(
          'admissionSessionId',
          'Admission session',
          structures.filter((item) => item.kind === 'academic_session'),
          admissionSessionId,
          setAdmissionSessionId,
          'Select admission session',
        )}
      </Card>
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="student-profile-actions"
      >
        <div className="min-w-0 flex-1">{feedback}</div>
        <Button disabled={isPending} type="submit">
          {isPending ? 'Saving profile…' : 'Save student profile'}
        </Button>
      </div>
    </form>
  );
}
