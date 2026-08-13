import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QrScanner } from '../src/features/attendance/qr-scanner.js';

interface ScannerConfig {
  readonly fps: number;
  readonly qrbox: (width: number, height: number) => { width: number; height: number };
  readonly showTorchButtonIfSupported: boolean;
  readonly showZoomSliderIfSupported: boolean;
  readonly supportedScanTypes: readonly number[];
}

let scannerConfig: ScannerConfig | undefined;
let scanSuccess: ((value: string) => void) | undefined;
const clearScanner = vi.fn(() => Promise.resolve());

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanType: { SCAN_TYPE_CAMERA: 0 },
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5QrcodeScanner: class {
    constructor(_id: string, config: ScannerConfig) {
      scannerConfig = config;
    }

    render(success: (value: string) => void) {
      scanSuccess = success;
    }

    clear = clearScanner;
  },
}));

describe('QR scanner reliability', () => {
  beforeEach(() => {
    scannerConfig = undefined;
    scanSuccess = undefined;
    clearScanner.mockClear();
  });

  it('uses an explicit responsive camera configuration', async () => {
    render(<QrScanner onScan={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open scanner' }));

    await waitFor(() => expect(scannerConfig).toBeDefined());
    expect(scannerConfig?.supportedScanTypes).toEqual([0]);
    expect(scannerConfig?.fps).toBe(20);
    expect(scannerConfig?.qrbox(500, 400)).toEqual({ height: 380, width: 380 });
    expect(scannerConfig?.qrbox(240, 200)).toEqual({ height: 190, width: 190 });
    expect(scannerConfig?.showTorchButtonIfSupported).toBe(true);
    expect(scannerConfig?.showZoomSliderIfSupported).toBe(true);
    expect(screen.getByRole('button', { name: 'Stop camera' })).toHaveClass('gap-2');
  });

  it('announces when the camera is active and ready to detect a QR', async () => {
    render(<QrScanner onScan={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open scanner' }));

    const scanner = screen.getByRole('region', { name: 'Scan the live QR scanner' });
    expect(await within(scanner).findByRole('status')).toHaveTextContent(
      'Camera active. Hold the QR code steady inside the frame.',
    );
  });

  it('renders attendance feedback inside the scanner card', () => {
    render(
      <QrScanner
        feedback={<p role="status">Attendance recorded successfully.</p>}
        onScan={() => undefined}
        tone="green"
      />,
    );

    const scanner = screen.getByRole('region', { name: 'Scan the live QR scanner' });
    expect(within(scanner).getByRole('status')).toHaveTextContent(
      'Attendance recorded successfully.',
    );
    expect(scanner).toHaveClass('from-emerald-50', 'dark:from-emerald-950');
  });

  it('dispatches a distinct scan once and cleans up when the camera closes', async () => {
    const onScan = vi.fn();
    render(<QrScanner continuous onScan={onScan} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open scanner' }));
    await waitFor(() => expect(scanSuccess).toBeDefined());
    scanSuccess?.('  v1.encrypted-attendance-token  ');
    scanSuccess?.('v1.encrypted-attendance-token');

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('v1.encrypted-attendance-token');
    fireEvent.click(screen.getByRole('button', { name: 'Stop camera' }));
    await waitFor(() => expect(clearScanner).toHaveBeenCalledTimes(1));
  });
});
