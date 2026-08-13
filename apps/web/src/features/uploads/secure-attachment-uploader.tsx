import type { AnnouncementAttachment, ApiResponse, UploadConfiguration } from '@qr/types';
import { buttonClassName } from '@qr/ui';
import { useQuery } from '@tanstack/react-query';
import { FileCheck2, LoaderCircle, Paperclip, Trash2 } from 'lucide-react';
import { useId, useState, type ChangeEvent } from 'react';
import { apiClient } from '../../api/client.js';

interface SecureAttachmentUploaderProps {
  readonly context: 'announcement' | 'event';
  readonly attachments: readonly AnnouncementAttachment[];
  readonly onChange: (attachments: readonly AnnouncementAttachment[]) => void;
  readonly maximumFiles?: number;
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SecureAttachmentUploader({
  context,
  attachments,
  onChange,
  maximumFiles = 8,
}: SecureAttachmentUploaderProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const configuration = useQuery({
    queryKey: ['uploads', 'configuration'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<UploadConfiguration>>('/uploads/configuration')).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = '';
    if (!files.length || !configuration.data?.configured) return;
    if (attachments.length + files.length > maximumFiles) {
      setMessage(`You can attach up to ${maximumFiles} files.`);
      return;
    }
    const invalid = files.find(
      (file) =>
        !configuration.data.allowedMimeTypes.includes(file.type) ||
        file.size < 1 ||
        file.size > configuration.data.maximumSizeBytes,
    );
    if (invalid) {
      setMessage(
        `${invalid.name} is not an allowed file or exceeds ${sizeLabel(configuration.data.maximumSizeBytes)}.`,
      );
      return;
    }
    setUploading(true);
    setMessage('');
    try {
      const uploaded: AnnouncementAttachment[] = [];
      for (const file of files) {
        const response = await apiClient.post<ApiResponse<AnnouncementAttachment>>(
          '/uploads',
          file,
          {
            headers: {
              'Content-Type': file.type,
              'X-File-Name': encodeURIComponent(file.name),
              'X-Upload-Context': context,
            },
          },
        );
        uploaded.push(response.data.data);
      }
      onChange([...attachments, ...uploaded]);
      setMessage(`${uploaded.length} file${uploaded.length === 1 ? '' : 's'} uploaded securely.`);
    } catch {
      setMessage(
        'The file could not be uploaded securely. Please retry or contact an administrator.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-3">
      {configuration.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="animate-spin motion-reduce:animate-none" size={16} /> Checking
          secure storage…
        </p>
      ) : configuration.data?.configured ? (
        <div>
          <input
            accept={configuration.data.allowedMimeTypes.join(',')}
            className="sr-only"
            disabled={uploading || attachments.length >= maximumFiles}
            id={inputId}
            multiple
            onChange={(event) => void upload(event)}
            type="file"
          />
          <label
            className={buttonClassName(
              'secondary',
              uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer',
            )}
            htmlFor={inputId}
          >
            {uploading ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={16}
              />
            ) : (
              <Paperclip aria-hidden="true" size={16} />
            )}
            {uploading ? 'Uploading securely…' : 'Choose files'}
          </label>
          <p className="mt-2 text-xs text-slate-500">
            PDF, JPEG, PNG, WebP, CSV, Word, or Excel · 10 MB each · {maximumFiles} files maximum
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Secure file storage is unavailable. An administrator must configure Cloudinary before
          files can be attached.
        </p>
      )}
      {attachments.length ? (
        <ul className="grid gap-2" aria-label="Attached files">
          {attachments.map((attachment) => (
            <li
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-100/65 px-3 dark:border-blue-800 dark:bg-blue-950/50"
              key={attachment.assetId ?? attachment.url}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 truncate text-sm font-semibold">
                  <FileCheck2 aria-hidden="true" className="shrink-0 text-primary" size={16} />{' '}
                  {attachment.name}
                </span>
                <span className="text-xs text-slate-500">{sizeLabel(attachment.sizeBytes)}</span>
              </span>
              <button
                aria-label={`Remove ${attachment.name}`}
                className="grid size-10 shrink-0 place-items-center rounded-lg text-danger hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/25 dark:hover:bg-red-950/30"
                onClick={() => onChange(attachments.filter((item) => item !== attachment))}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p aria-live="polite" className="text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
