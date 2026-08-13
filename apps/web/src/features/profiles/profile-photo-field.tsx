import { Camera, CheckCircle2, ImagePlus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';

const PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROFILE_PHOTO_BYTES = 10 * 1024 * 1024;

export function validateProfilePhoto(file: File): string | null {
  if (!PROFILE_PHOTO_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
  if (!file.size) return 'The selected image is empty.';
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return 'Profile photographs must be 10 MB or smaller.';
  return null;
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProfilePhotoField({
  currentPhotoUrl,
  disabled = false,
  onChange,
}: {
  readonly currentPhotoUrl?: string;
  readonly disabled?: boolean;
  readonly onChange: (file: File | undefined) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(undefined);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const validationError = validateProfilePhoto(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(undefined);
      onChange(undefined);
      event.currentTarget.value = '';
      return;
    }
    setError(undefined);
    setSelectedFile(file);
    onChange(file);
  };

  const clearPhoto = () => {
    setSelectedFile(undefined);
    setError(undefined);
    if (inputRef.current) inputRef.current.value = '';
    onChange(undefined);
  };

  const displayedUrl = previewUrl ?? currentPhotoUrl;
  const alt = previewUrl ? 'Selected profile preview' : 'Current profile photograph';

  return (
    <div className="grid gap-3 sm:col-span-2">
      <span className="text-sm font-medium">Profile photograph</span>
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/45 sm:flex-row sm:items-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-emerald-300 bg-emerald-100 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {displayedUrl ? (
            <img alt={alt} className="size-full object-cover" src={displayedUrl} />
          ) : (
            <Camera aria-hidden="true" size={34} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-within:ring-4 focus-within:ring-emerald-500/25 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            htmlFor={inputId}
          >
            <ImagePlus aria-hidden="true" size={18} />
            {selectedFile ? 'Replace photograph' : 'Choose photograph'}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-label="Profile photograph"
            className="sr-only"
            disabled={disabled}
            id={inputId}
            onChange={selectPhoto}
            ref={inputRef}
            type="file"
          />
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            JPEG, PNG, or WebP. Maximum file size: 10 MB.
          </p>
          {selectedFile ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
                role="status"
              >
                <CheckCircle2 aria-hidden="true" size={17} />
                {selectedFile.name} · {fileSize(selectedFile.size)} — ready to upload when you save.
              </p>
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-200"
                disabled={disabled}
                onClick={clearPhoto}
                type="button"
              >
                <X aria-hidden="true" size={14} />
                Clear selected photograph
              </button>
            </div>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
