import { EVENT_ATTENDANCE_METHODS, EVENT_TYPES } from '@qr/shared';
import type {
  AcademicStructurePage,
  ApiResponse,
  EventAttachment,
  EventSummary,
  NotificationChannel,
  UserRole,
} from '@qr/types';
import { Badge, Button, Card, CardHeader, Input } from '@qr/ui';
import { BellRing, Image, Paperclip, ScanLine, UsersRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SecureAttachmentUploader } from '../uploads/secure-attachment-uploader.js';
import { apiClient } from '../../api/client.js';

interface EventEditorProps {
  readonly event?: EventSummary;
  readonly pending: boolean;
  readonly error?: string | undefined;
  readonly onSubmit: (body: Record<string, unknown>) => void;
}

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';
const roles: readonly { readonly value: UserRole; readonly label: string }[] = [
  { value: 'student', label: 'Students' },
  { value: 'lecturer', label: 'Lecturers' },
  { value: 'examiner', label: 'Examiners' },
  { value: 'faculty_admin', label: 'Faculty administrators' },
  { value: 'department_admin', label: 'Department administrators' },
];
const reminderOptions = [5, 10, 15, 30, 60, 120, 1440] as const;

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function checked(data: FormData, key: string): boolean {
  return data.get(key) === 'on';
}

function localDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function reminderLabel(minutes: number): string {
  if (minutes === 1440) return '1 day';
  if (minutes >= 60) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
  return `${minutes} minutes`;
}

export function EventEditor({ event, pending, error, onSubmit }: EventEditorProps) {
  const [methods, setMethods] = useState<string[]>([
    ...(event?.attendanceMethods ?? ['dynamic_qr']),
  ]);
  const [attachments, setAttachments] = useState<readonly EventAttachment[]>(
    event?.attachments ?? [],
  );
  const [bannerUrl, setBannerUrl] = useState(event?.bannerUrl);
  const [reminders, setReminders] = useState<number[]>([
    ...(event?.reminderOffsetsMinutes ?? [1440, 60]),
  ]);
  const periods = useQuery({
    queryKey: ['academic', 'structure', 'event-periods'],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<AcademicStructurePage>>('/academic/structure', {
          params: { kind: 'all', status: 'active', page: 1, limit: 100 },
        })
      ).data.data.items,
  });

  const submit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const startsAt = text(data, 'startsAt');
    const endsAt = text(data, 'endsAt');
    const gpsEnabled = methods.includes('gps');
    const pin = text(data, 'attendancePin');
    const customReminder = Number(text(data, 'customReminder'));
    const reminderOffsetsMinutes = [
      ...reminders,
      ...(Number.isInteger(customReminder) && customReminder >= 5 ? [customReminder] : []),
    ].filter((value, index, values) => values.indexOf(value) === index);
    const notificationChannels: NotificationChannel[] = [
      'in_app',
      ...(checked(data, 'email') ? (['email'] as const) : []),
      ...(checked(data, 'push') ? (['push'] as const) : []),
    ];
    onSubmit({
      title: text(data, 'title'),
      description: text(data, 'description'),
      eventType: text(data, 'eventType'),
      ...(text(data, 'customType') ? { customType: text(data, 'customType') } : {}),
      ...(text(data, 'campus') ? { campus: text(data, 'campus') } : {}),
      venue: text(data, 'venue'),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      timeZone: text(data, 'timeZone'),
      ...(text(data, 'academicSessionId')
        ? { academicSessionId: text(data, 'academicSessionId') }
        : {}),
      ...(text(data, 'termId') ? { termId: text(data, 'termId') } : {}),
      ...(text(data, 'capacity') ? { capacity: Number(text(data, 'capacity')) } : {}),
      registrationRequired: checked(data, 'registrationRequired'),
      mandatory: checked(data, 'mandatory'),
      audience: {
        roles: data.getAll('roles').filter((value): value is string => typeof value === 'string'),
        ...(text(data, 'audienceCampus') ? { campus: text(data, 'audienceCampus') } : {}),
        ...(text(data, 'facultyName') ? { facultyName: text(data, 'facultyName') } : {}),
        ...(text(data, 'departmentId') ? { departmentId: text(data, 'departmentId') } : {}),
        ...(text(data, 'programme') ? { programme: text(data, 'programme') } : {}),
        ...(text(data, 'level') ? { level: text(data, 'level') } : {}),
      },
      reminderOffsetsMinutes,
      notificationChannels,
      ...(text(data, 'postEventMessage')
        ? { postEventMessage: text(data, 'postEventMessage') }
        : {}),
      participantReportAvailable: checked(data, 'participantReportAvailable'),
      attendanceMethods: methods,
      qrRotationSeconds: Number(text(data, 'qrRotationSeconds') || event?.qrRotationSeconds || 60),
      ...(gpsEnabled
        ? {
            gps: {
              latitude: Number(text(data, 'latitude')),
              longitude: Number(text(data, 'longitude')),
              maximumRadiusMetres: Number(text(data, 'maximumRadiusMetres') || 100),
            },
          }
        : {}),
      faceVerificationRequired: methods.includes('face'),
      manualAttendanceAllowed: methods.includes('manual'),
      pinAttendanceAllowed: methods.includes('pin'),
      ...(pin ? { attendancePin: pin } : {}),
      ...(bannerUrl ? { bannerUrl } : {}),
      attachments,
    });
  };

  const toggleMethod = (method: string, enabled: boolean) =>
    setMethods((current) =>
      enabled ? [...new Set([...current, method])] : current.filter((item) => item !== method),
    );
  const updateAttachments = (next: readonly EventAttachment[]) => {
    if (
      bannerUrl &&
      attachments.some((item) => item.url === bannerUrl) &&
      !next.some((item) => item.url === bannerUrl)
    )
      setBannerUrl(undefined);
    setAttachments(next);
  };
  const images = attachments.filter((attachment) => attachment.mimeType.startsWith('image/'));

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          defaultValue={event?.title}
          label="Event title"
          maxLength={180}
          minLength={3}
          name="title"
          required
        />
        <label className="grid gap-2 text-sm font-medium">
          Event type
          <select
            className={selectClass}
            defaultValue={event?.eventType ?? 'orientation'}
            name="eventType"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <Input
          defaultValue={event?.customType}
          label="Custom event type (when selected)"
          maxLength={100}
          name="customType"
        />
        <Input defaultValue={event?.venue} label="Venue" maxLength={240} name="venue" required />
        <Input defaultValue={event?.campus} label="Campus" name="campus" />
        <Input
          defaultValue={event?.capacity}
          label="Capacity (optional)"
          min={1}
          name="capacity"
          type="number"
        />
        <Input
          defaultValue={localDate(event?.startsAt)}
          label="Starts at"
          name="startsAt"
          required
          type="datetime-local"
        />
        <Input
          defaultValue={localDate(event?.endsAt)}
          label="Ends at"
          name="endsAt"
          required
          type="datetime-local"
        />
        <Input
          defaultValue={event?.timeZone ?? 'Africa/Lagos'}
          label="Time zone"
          name="timeZone"
          required
        />
        <label className="grid gap-2 text-sm font-medium">
          Academic session
          <select
            className={selectClass}
            defaultValue={event?.academicSession?.id ?? ''}
            name="academicSessionId"
          >
            <option value="">Not assigned</option>
            {periods.data
              ?.filter((item) => item.kind === 'academic_session')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Semester or term
          <select className={selectClass} defaultValue={event?.term?.id ?? ''} name="termId">
            <option value="">Not assigned</option>
            {periods.data
              ?.filter((item) => item.kind === 'term')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Description
        <textarea
          className={`${selectClass} min-h-32 py-3`}
          defaultValue={event?.description}
          maxLength={5000}
          minLength={10}
          name="description"
          required
        />
        <span className="text-xs font-normal text-slate-500">Plain text only.</span>
      </label>

      <Card className="p-5" tone="blue">
        <CardHeader
          icon={<UsersRound size={19} />}
          level={3}
          title="Audience and attendance policy"
          tone="blue"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <label className="flex min-h-11 items-center gap-3 text-sm" key={role.value}>
              <input
                defaultChecked={
                  event ? event.audience.roles.includes(role.value) : role.value === 'student'
                }
                name="roles"
                type="checkbox"
                value={role.value}
              />{' '}
              {role.label}
            </label>
          ))}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input defaultChecked={event?.mandatory} name="mandatory" type="checkbox" /> Mandatory
            attendance
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              defaultChecked={event?.registrationRequired}
              name="registrationRequired"
              type="checkbox"
            />{' '}
            Registration required
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            defaultValue={event?.audience.campus}
            label="Audience campus"
            name="audienceCampus"
          />
          <Input
            defaultValue={event?.audience.facultyName}
            label="Faculty or school"
            name="facultyName"
          />
          <Input
            defaultValue={event?.audience.departmentId}
            label="Department identifier"
            name="departmentId"
          />
          <Input defaultValue={event?.audience.programme} label="Programme" name="programme" />
          <Input defaultValue={event?.audience.level} label="Level" name="level" />
        </div>
      </Card>

      <Card className="p-5" tone="teal">
        <CardHeader
          icon={<ScanLine size={19} />}
          level={3}
          title="Verification methods"
          tone="teal"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {EVENT_ATTENDANCE_METHODS.map((method) => (
            <label className="flex min-h-11 items-center gap-3 text-sm" key={method}>
              <input
                checked={methods.includes(method)}
                onChange={(changeEvent) => toggleMethod(method, changeEvent.currentTarget.checked)}
                type="checkbox"
              />
              {method.replaceAll('_', ' ')}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {methods.includes('dynamic_qr') ? (
            <Input
              defaultValue={event?.qrRotationSeconds ?? 60}
              label="QR rotation (seconds)"
              max={120}
              min={30}
              name="qrRotationSeconds"
              type="number"
            />
          ) : null}
          {methods.includes('pin') ? (
            <Input
              label={
                event ? 'Replace secure PIN (leave blank to keep current)' : 'Secure attendance PIN'
              }
              maxLength={10}
              minLength={6}
              name="attendancePin"
              required={!event}
              type="password"
            />
          ) : null}
          {methods.includes('gps') ? (
            <>
              <Input
                defaultValue={event?.gps?.latitude}
                label="Venue latitude"
                max={90}
                min={-90}
                name="latitude"
                required
                step="any"
                type="number"
              />
              <Input
                defaultValue={event?.gps?.longitude}
                label="Venue longitude"
                max={180}
                min={-180}
                name="longitude"
                required
                step="any"
                type="number"
              />
              <Input
                defaultValue={event?.gps?.maximumRadiusMetres ?? 100}
                label="Maximum radius (metres)"
                max={5000}
                min={10}
                name="maximumRadiusMetres"
                required
                type="number"
              />
            </>
          ) : null}
        </div>
      </Card>

      <Card className="p-5" tone="gold">
        <CardHeader
          description="Select when targeted participants should be reminded."
          icon={<BellRing size={19} />}
          level={3}
          title="Reminders and notifications"
          tone="gold"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {reminderOptions.map((offset) => (
            <label className="flex min-h-11 items-center gap-3 text-sm" key={offset}>
              <input
                checked={reminders.includes(offset)}
                onChange={(changeEvent) =>
                  setReminders((current) =>
                    changeEvent.currentTarget.checked
                      ? [...new Set([...current, offset])]
                      : current.filter((item) => item !== offset),
                  )
                }
                type="checkbox"
              />
              {reminderLabel(offset)} before
            </label>
          ))}
        </div>
        <Input
          label="Custom reminder (minutes, optional)"
          max={43_200}
          min={5}
          name="customReminder"
          type="number"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input checked readOnly type="checkbox" /> In-app institutional notices
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              defaultChecked={event?.notificationChannels.includes('email')}
              name="email"
              type="checkbox"
            />{' '}
            Email when configured
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              defaultChecked={event?.notificationChannels.includes('push')}
              name="push"
              type="checkbox"
            />{' '}
            PWA push when configured
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-400">
            <input disabled type="checkbox" /> SMS unavailable
          </label>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Post-event message (optional)
            <textarea
              className={`${selectClass} min-h-24 py-3`}
              defaultValue={event?.postEventMessage}
              maxLength={1000}
              name="postEventMessage"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              defaultChecked={event?.participantReportAvailable}
              name="participantReportAvailable"
              type="checkbox"
            />{' '}
            Notify participants when their event report is available
          </label>
        </div>
      </Card>

      <Card className="p-5" tone="violet">
        <CardHeader
          icon={<Paperclip size={19} />}
          level={3}
          title="Banner and attachments"
          tone="violet"
        />
        <div className="mt-4">
          <SecureAttachmentUploader
            attachments={attachments}
            context="event"
            maximumFiles={10}
            onChange={updateAttachments}
          />
        </div>
        {images.length ? (
          <div className="mt-4">
            <p className="text-sm font-semibold">Choose an uploaded image as the event banner</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((image) => (
                <Button
                  key={image.assetId ?? image.url}
                  onClick={() => setBannerUrl(image.url)}
                  type="button"
                  variant={bannerUrl === image.url ? 'primary' : 'secondary'}
                >
                  <Image aria-hidden="true" size={16} /> {image.name}
                  {bannerUrl === image.url ? <Badge tone="success">Selected</Badge> : null}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Button disabled={pending} type="submit">
        {pending ? 'Saving…' : event ? 'Save event changes' : 'Create event draft'}
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
