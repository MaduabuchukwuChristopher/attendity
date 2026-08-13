import { Building2, CheckCircle2, ImagePlus, Trash2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;

export type InstitutionLogoChange =
  | { readonly kind: 'upload'; readonly file: File }
  | { readonly kind: 'remove' }
  | { readonly kind: 'unchanged' };

export interface InstitutionLogoValue {
  readonly assetId: string;
  readonly url: string;
}

function size(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InstitutionLogoField({
  current,
  disabled = false,
  onChange,
}: {
  readonly current: InstitutionLogoValue | null;
  readonly disabled?: boolean;
  readonly onChange: (change: InstitutionLogoChange) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!file) return undefined;
    const value = URL.createObjectURL(file);
    setPreview(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);

  const select = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files?.[0];
    if (!selected) return;
    const message = !TYPES.has(selected.type)
      ? 'Choose a JPEG, PNG, or WebP image.'
      : !selected.size
        ? 'The selected logo is empty.'
        : selected.size > MAX_BYTES
          ? 'Institution logos must be 10 MB or smaller.'
          : undefined;
    if (message) {
      setError(message);
      event.currentTarget.value = '';
      return;
    }
    setError(undefined);
    setRemoved(false);
    setFile(selected);
    onChange({ kind: 'upload', file: selected });
  };

  const clearSelection = () => {
    setFile(undefined);
    setPreview(undefined);
    setError(undefined);
    if (inputRef.current) inputRef.current.value = '';
    onChange({ kind: 'unchanged' });
  };

  const remove = () => {
    setFile(undefined);
    setPreview(undefined);
    setRemoved(true);
    onChange({ kind: 'remove' });
  };

  const displayed = preview ?? (!removed ? current?.url : undefined);
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-100/70 p-4 dark:border-blue-800 dark:bg-blue-950/60 sm:flex-row sm:items-center">
        <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-slate-950 dark:text-blue-300">
          {displayed ? (
            <img
              alt={preview ? 'Selected institution logo' : 'Current institution logo'}
              className="size-full object-contain p-2"
              src={displayed}
            />
          ) : (
            <Building2 aria-hidden="true" size={38} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 focus-within:ring-4 focus-within:ring-blue-500/25 dark:bg-blue-600 dark:hover:bg-blue-500"
            htmlFor={inputId}
          >
            <ImagePlus aria-hidden="true" size={18} />
            {displayed ? 'Replace institution logo' : 'Choose institution logo'}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-label="Institution logo"
            className="sr-only"
            disabled={disabled}
            id={inputId}
            onChange={select}
            ref={inputRef}
            type="file"
          />
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            JPEG, PNG, or WebP. Maximum file size: 10 MB.
          </p>
          {file ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200"
                role="status"
              >
                <CheckCircle2 aria-hidden="true" size={17} />
                {file.name} · {size(file.size)} — ready to upload.
              </p>
              <button
                aria-label="Clear selected institution logo"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white"
                disabled={disabled}
                onClick={clearSelection}
                type="button"
              >
                <X aria-hidden="true" size={14} /> Clear
              </button>
            </div>
          ) : null}
          {current && !removed && !file ? (
            <button
              aria-label="Remove institution logo"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800"
              disabled={disabled}
              onClick={remove}
              type="button"
            >
              <Trash2 aria-hidden="true" size={15} /> Remove institution logo
            </button>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
