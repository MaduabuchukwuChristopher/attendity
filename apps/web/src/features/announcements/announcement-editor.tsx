import type { AnnouncementSummary, UserRole } from '@qr/types';
import { Button, Card, CardHeader, Input } from '@qr/ui';
import { Eye, Megaphone, Paperclip } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { SecureAttachmentUploader } from '../uploads/secure-attachment-uploader.js';

export interface CourseOption {
  readonly _id: string;
  readonly code: string;
  readonly title: string;
}

interface AnnouncementEditorProps {
  readonly announcement?: AnnouncementSummary;
  readonly courses: readonly CourseOption[];
  readonly isLecturer: boolean;
  readonly pending: boolean;
  readonly error?: string;
  readonly onSubmit: (body: Record<string, unknown>) => void;
}

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';
const roles: readonly { readonly value: UserRole; readonly label: string }[] = [
  { value: 'student', label: 'Students' },
  { value: 'lecturer', label: 'Lecturers' },
  { value: 'examiner', label: 'Examiners' },
  { value: 'faculty_admin', label: 'Faculty or school administrators' },
  { value: 'department_admin', label: 'Department administrators' },
];

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function checked(data: FormData, key: string): boolean {
  return data.get(key) === 'on';
}

export function AnnouncementEditor({
  announcement,
  courses,
  isLecturer,
  pending,
  error,
  onSubmit,
}: AnnouncementEditorProps) {
  const [preview, setPreview] = useState(false);
  const [previewTitle, setPreviewTitle] = useState(announcement?.title ?? 'Announcement preview');
  const [previewMessage, setPreviewMessage] = useState(
    announcement?.message ?? 'Your message preview will appear here.',
  );
  const [attachments, setAttachments] = useState(announcement?.attachments ?? []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const expiresAt = text(data, 'expiresAt');
    const audience = {
      roles: data.getAll('roles').filter((value): value is string => typeof value === 'string'),
      ...(text(data, 'campus') ? { campus: text(data, 'campus') } : {}),
      ...(text(data, 'facultyName') ? { facultyName: text(data, 'facultyName') } : {}),
      ...(text(data, 'departmentId') ? { departmentId: text(data, 'departmentId') } : {}),
      ...(text(data, 'programme') ? { programme: text(data, 'programme') } : {}),
      ...(text(data, 'level') ? { level: text(data, 'level') } : {}),
      ...(text(data, 'courseId') ? { courseId: text(data, 'courseId') } : {}),
    };
    onSubmit({
      title: text(data, 'title'),
      message: text(data, 'message'),
      category: text(data, 'category'),
      priority: text(data, 'priority'),
      audience,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      attachments,
      pinned: checked(data, 'pinned'),
      acknowledgementRequired: checked(data, 'acknowledgementRequired'),
      channels: [
        'in_app',
        ...(checked(data, 'email') ? ['email'] : []),
        ...(checked(data, 'push') ? ['push'] : []),
      ],
    });
  };
  return (
    <form className="grid gap-5" id="announcement-form" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          defaultValue={announcement?.title}
          label="Title"
          maxLength={180}
          minLength={3}
          name="title"
          onChange={(event) => setPreviewTitle(event.currentTarget.value)}
          required
        />
        <label className="grid gap-2 text-sm font-medium">
          Category
          <select
            className={selectClass}
            defaultValue={announcement?.category ?? 'general'}
            name="category"
          >
            {['academic', 'administrative', 'emergency', 'event', 'general'].map((item) => (
              <option key={item} value={item}>
                {item[0]?.toUpperCase()}
                {item.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Priority
          <select
            className={selectClass}
            defaultValue={announcement?.priority ?? 'normal'}
            name="priority"
          >
            {['low', 'normal', 'high', 'urgent'].map((item) => (
              <option key={item} value={item}>
                {item[0]?.toUpperCase()}
                {item.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <Input
          defaultValue={announcement?.expiresAt ? announcement.expiresAt.slice(0, 16) : ''}
          label="Expires at (optional)"
          name="expiresAt"
          type="datetime-local"
        />
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Message
        <textarea
          className={`${selectClass} min-h-36 resize-y py-3`}
          defaultValue={announcement?.message}
          maxLength={5000}
          minLength={3}
          name="message"
          onChange={(event) => setPreviewMessage(event.currentTarget.value)}
          required
        />
        <span className="text-xs font-normal text-slate-500">
          Plain text only. Links can be added as secure attachments.
        </span>
      </label>
      <fieldset className="rounded-2xl border border-border p-4 dark:border-slate-700">
        <legend className="px-2 text-sm font-bold">Target audience</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <label className="flex min-h-11 items-center gap-3 text-sm" key={role.value}>
              <input
                defaultChecked={
                  announcement?.audience.roles.includes(role.value) ||
                  (isLecturer && role.value === 'student')
                }
                name="roles"
                type="checkbox"
                value={role.value}
              />
              {role.label}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">
            Course {isLecturer ? '(required)' : '(optional)'}
            <select
              className={selectClass}
              defaultValue={announcement?.audience.courseId ?? ''}
              name="courseId"
              required={isLecturer}
            >
              <option value="">All matching users</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </label>
          <Input
            defaultValue={announcement?.audience.campus}
            label="Campus (optional)"
            name="campus"
          />
          <Input
            defaultValue={announcement?.audience.facultyName}
            label="Faculty or school (optional)"
            name="facultyName"
          />
          <Input
            defaultValue={announcement?.audience.departmentId}
            label="Department identifier (optional)"
            name="departmentId"
          />
          <Input
            defaultValue={announcement?.audience.programme}
            label="Programme (optional)"
            name="programme"
          />
          <Input
            defaultValue={announcement?.audience.level}
            label="Level (optional)"
            name="level"
          />
        </div>
      </fieldset>
      <fieldset className="rounded-2xl border border-border p-4 dark:border-slate-700">
        <legend className="px-2 text-sm font-bold">Delivery and response</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input checked readOnly type="checkbox" /> In-app notification
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              defaultChecked={announcement?.channels.includes('email')}
              name="email"
              type="checkbox"
            />{' '}
            Email when configured
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              defaultChecked={announcement?.channels.includes('push')}
              name="push"
              type="checkbox"
            />{' '}
            PWA push when configured
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-400">
            <input disabled type="checkbox" /> SMS unavailable
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input defaultChecked={announcement?.pinned} name="pinned" type="checkbox" /> Pin in
            recipient feeds
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              defaultChecked={announcement?.acknowledgementRequired}
              name="acknowledgementRequired"
              type="checkbox"
            />{' '}
            Require acknowledgement
          </label>
        </div>
      </fieldset>
      <fieldset className="rounded-2xl border border-border p-4 dark:border-slate-700">
        <legend className="flex items-center gap-2 px-2 text-sm font-bold">
          <Paperclip size={15} /> Secure file attachments
        </legend>
        <SecureAttachmentUploader
          attachments={attachments}
          context="announcement"
          maximumFiles={8}
          onChange={setAttachments}
        />
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} type="submit">
          {pending ? 'Saving…' : announcement ? 'Save changes' : 'Create draft'}
        </Button>
        <Button onClick={() => setPreview((value) => !value)} type="button" variant="secondary">
          <Eye size={16} /> {preview ? 'Hide preview' : 'Preview'}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {preview ? (
        <Card
          className="border-l-4 border-l-primary p-5"
          aria-label="Announcement preview"
          tone="violet"
        >
          <CardHeader
            description="Announcement preview"
            icon={<Megaphone size={19} />}
            level={3}
            title={previewTitle || 'Untitled announcement'}
            tone="violet"
          />
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {previewMessage || 'No message yet.'}
          </p>
        </Card>
      ) : null}
    </form>
  );
}
