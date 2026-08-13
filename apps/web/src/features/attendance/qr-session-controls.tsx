import type { AttendanceQrMode } from '@qr/types';
import { Button } from '@qr/ui';
import { Download, FileText, Printer, Radio, ScanLine } from 'lucide-react';
import { useState } from 'react';

const fieldClassName =
  'h-11 rounded-xl border border-border bg-surface px-3 text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-950';

export function QrSessionControls() {
  const [mode, setMode] = useState<AttendanceQrMode>('static');

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-semibold text-slate-900 dark:text-white">QR mode</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm has-[:checked]:border-emerald-700 has-[:checked]:ring-2 has-[:checked]:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:has-[:checked]:border-emerald-400 dark:has-[:checked]:ring-emerald-900">
          <input
            checked={mode === 'static'}
            className="mt-1 size-4 accent-primary"
            name="qrMode"
            onChange={() => setMode('static')}
            type="radio"
            value="static"
          />
          <span>
            <span className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200">
              <ScanLine aria-hidden="true" size={17} /> Static QR
            </span>
            <span className="mt-1 block leading-5 text-slate-600 dark:text-slate-300">
              Can be printed and posted inside the classroom until the check-in window ends.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm has-[:checked]:border-blue-700 has-[:checked]:ring-2 has-[:checked]:ring-blue-200 dark:border-blue-900 dark:bg-blue-950 dark:has-[:checked]:border-blue-400 dark:has-[:checked]:ring-blue-900">
          <input
            checked={mode === 'rotating'}
            className="mt-1 size-4 accent-blue-600"
            name="qrMode"
            onChange={() => setMode('rotating')}
            type="radio"
            value="rotating"
          />
          <span>
            <span className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-200">
              <Radio aria-hidden="true" size={17} /> Rotating QR
            </span>
            <span className="mt-1 block leading-5 text-slate-600 dark:text-slate-300">
              Intended for a digital lecture-hall or event-centre display and cannot be exported.
            </span>
          </span>
        </label>
      </div>
      {mode === 'rotating' ? (
        <label className="grid gap-2 text-sm font-medium">
          Rotation interval
          <select
            aria-label="Rotation interval"
            className={fieldClassName}
            defaultValue="60"
            name="qrRotationSeconds"
          >
            <option value="30">30 seconds</option>
            <option value="45">45 seconds</option>
            <option value="60">60 seconds</option>
            <option value="90">90 seconds</option>
            <option value="120">120 seconds</option>
          </select>
        </label>
      ) : (
        <input name="qrRotationSeconds" type="hidden" value="60" />
      )}
    </fieldset>
  );
}

export function StaticQrExportActions({
  mode,
  onDownloadPdf,
  onDownloadPng,
  onPrint,
  ready,
}: {
  readonly mode: AttendanceQrMode;
  readonly onDownloadPdf: () => void;
  readonly onDownloadPng: () => void;
  readonly onPrint: () => void;
  readonly ready: boolean;
}) {
  if (mode === 'rotating')
    return (
      <p className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        Rotating codes cannot be printed or downloaded. Keep this session on a live digital display.
      </p>
    );

  return (
    <div aria-label="Static QR export options" className="flex flex-wrap gap-2">
      <Button disabled={!ready} onClick={onDownloadPng} variant="image">
        <Download aria-hidden="true" size={17} /> Download PNG
      </Button>
      <Button disabled={!ready} onClick={onDownloadPdf} variant="download">
        <FileText aria-hidden="true" size={17} /> Download PDF
      </Button>
      <Button disabled={!ready} onClick={onPrint} variant="print">
        <Printer aria-hidden="true" size={17} /> Print QR
      </Button>
    </div>
  );
}
