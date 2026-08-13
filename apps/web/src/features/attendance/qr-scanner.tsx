import { Button, Card } from '@qr/ui';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface QrScannerProps {
  readonly onScan: (value: string) => void;
  readonly continuous?: boolean;
  readonly closeSignal?: number;
  readonly title?: string;
  readonly description?: string;
  readonly feedback?: ReactNode;
  readonly tone?: 'blue' | 'green';
}

const scannerToneClasses = {
  blue: 'relative overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-100 shadow-lg shadow-blue-950/5 dark:border-blue-800 dark:from-blue-950 dark:via-slate-950 dark:to-cyan-950',
  green:
    'relative overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-100 shadow-lg shadow-emerald-950/5 dark:border-emerald-800 dark:from-emerald-950 dark:via-slate-950 dark:to-teal-950',
} as const;

const scannerIconClasses = {
  blue: 'bg-blue-600 text-white shadow-blue-900/20 dark:bg-blue-400 dark:text-blue-950',
  green:
    'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-900/20 dark:from-emerald-400 dark:to-teal-400 dark:text-emerald-950',
} as const;

export function QrScanner({
  onScan,
  continuous = false,
  closeSignal,
  title = 'Scan the live QR',
  description = 'Use your phone or laptop camera. Camera frames stay on this device.',
  feedback,
  tone = 'blue',
}: QrScannerProps) {
  const reactId = useId();
  const scannerId = `attendance-scanner-${reactId.replaceAll(':', '')}`;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'closed' | 'starting' | 'active' | 'error'>('closed');
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);
  const closeSignalRef = useRef(closeSignal);
  const lastScanRef = useRef({ value: '', time: 0 });
  onScanRef.current = onScan;

  useEffect(() => {
    if (closeSignal === undefined || closeSignalRef.current === closeSignal) return;
    closeSignalRef.current = closeSignal;
    setStatus('closed');
    setOpen(false);
  }, [closeSignal]);

  useEffect(() => {
    if (!open) return undefined;
    setStatus('starting');
    setError('');
    let active = true;
    let clear: (() => Promise<void>) | undefined;
    void import('html5-qrcode')
      .then(({ Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats }) => {
        if (!active) return;
        const scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 20,
            qrbox: (width, height) => {
              const size = Math.min(480, Math.floor(Math.min(width, height) * 0.95));
              return { width: size, height: size };
            },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          false,
        );
        scanner.render(
          (decodedText) => {
            const value = decodedText.trim();
            const now = Date.now();
            if (value === lastScanRef.current.value && now - lastScanRef.current.time < 2_000)
              return;
            lastScanRef.current = { value, time: now };
            onScanRef.current(value);
            if (!continuous) setOpen(false);
          },
          () => undefined,
        );
        setStatus('active');
        clear = async () => scanner.clear();
      })
      .catch(() => {
        setStatus('error');
        setError('The camera scanner could not be started on this device.');
      });
    return () => {
      active = false;
      if (clear) void clear().catch(() => undefined);
    };
  }, [continuous, open, scannerId]);

  return (
    <Card
      aria-label={`${title} scanner`}
      className={`self-start p-5 ${scannerToneClasses[tone]}`}
      role="region"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl shadow-lg ${scannerIconClasses[tone]}`}
          >
            <ScanLine aria-hidden="true" size={21} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
          </div>
        </div>
        <Button
          className="gap-2"
          onClick={() =>
            setOpen((value) => {
              if (value) setStatus('closed');
              return !value;
            })
          }
        >
          {open ? (
            <CameraOff aria-hidden="true" size={18} />
          ) : (
            <Camera aria-hidden="true" size={18} />
          )}
          {open ? (status === 'starting' ? 'Starting camera…' : 'Stop camera') : 'Open scanner'}
        </Button>
      </div>
      {open ? <div className="mt-5 overflow-hidden rounded-2xl" id={scannerId} /> : null}
      {open && status === 'active' && !error && !feedback ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
            tone === 'green'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
              : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200'
          }`}
          role="status"
        >
          Camera active. Hold the QR code steady inside the frame.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {feedback}
    </Card>
  );
}
