import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  QrSessionControls,
  StaticQrExportActions,
} from '../src/features/attendance/qr-session-controls.js';
import { printStaticQr } from '../src/features/attendance/static-qr-poster.js';

describe('lecturer QR session controls', () => {
  it('defaults to printable static mode and hides rotation settings', () => {
    render(<QrSessionControls />);

    expect(screen.getByRole('radio', { name: /static qr/i })).toBeChecked();
    expect(screen.queryByLabelText(/rotation interval/i)).not.toBeInTheDocument();
    expect(screen.getByText(/printed and posted inside the classroom/i)).toBeVisible();
  });

  it('shows digital-display settings when rotating mode is selected', () => {
    render(<QrSessionControls />);

    fireEvent.click(screen.getByRole('radio', { name: /rotating qr/i }));

    expect(screen.getByLabelText(/rotation interval/i)).toBeVisible();
    expect(screen.getByText(/digital lecture-hall or event-centre display/i)).toBeVisible();
  });

  it('offers image, PDF, and print actions only for a ready static QR', () => {
    const handlers = {
      onDownloadPdf: vi.fn(),
      onDownloadPng: vi.fn(),
      onPrint: vi.fn(),
    };
    const { rerender } = render(
      <StaticQrExportActions mode="static" ready={false} {...handlers} />,
    );

    expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /print qr/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /download png/i })).toHaveClass('bg-rose-600');
    expect(screen.getByRole('button', { name: /download pdf/i })).toHaveClass('bg-blue-600');
    expect(screen.getByRole('button', { name: /print qr/i })).toHaveClass('bg-violet-600');

    rerender(<StaticQrExportActions mode="rotating" ready {...handlers} />);

    expect(screen.queryByRole('button', { name: /download png/i })).not.toBeInTheDocument();
    expect(screen.getByText(/rotating codes cannot be printed or downloaded/i)).toBeVisible();
  });

  it('includes the approved institution logo in the printable static poster', () => {
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close: vi.fn() },
      addEventListener: vi.fn(),
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window);

    printStaticQr('data:image/png;base64,qr', {
      checkInWindow: '10:00 – 12:00',
      course: 'CSC 401 — Systems Analysis',
      institution: 'Attendity University',
      lecturer: 'Dr Ada Okafor',
      logoUrl: 'https://res.cloudinary.com/attendity/image/upload/logo.png',
    });

    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('https://res.cloudinary.com/attendity/image/upload/logo.png'),
    );
  });
});
