import './setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ExcelJS from 'exceljs';
import { ClearanceExportService } from '../src/services/clearance-export.service.js';
import { clearanceExportFixture } from './clearance-export.fixture.js';
import { AnalyticsExportService } from '../src/services/analytics-export.service.js';
import type { AnalyticsReport } from '@qr/types';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

void describe('managed branding in generated exports', () => {
  void it('resolves and embeds managed logo and student photograph in clearance output', async () => {
    const calls: string[] = [];
    const resolver = {
      resolveImage: async (input: { readonly assetId?: string }) => {
        calls.push(input.assetId ?? 'legacy');
        return { buffer: png, mimeType: 'image/png' as const, source: 'asset' as const };
      },
    };
    const service = new ClearanceExportService(resolver);
    const report = {
      ...clearanceExportFixture,
      university: {
        ...clearanceExportFixture.university,
        logoAssetId: 'logo-asset',
        logoUrl: 'https://res.cloudinary.com/attendity/image/upload/logo.png',
      },
      student: {
        ...clearanceExportFixture.student,
        photoAssetId: 'photo-asset',
        photoUrl: 'https://res.cloudinary.com/attendity/image/upload/photo.png',
      },
    };

    const pdf = await service.pdf(report, { universityId: 'university-id' });
    const xlsx = await service.excel(report, { universityId: 'university-id' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsx as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.deepEqual(calls, ['logo-asset', 'photo-asset', 'logo-asset', 'photo-asset']);
    assert.ok((workbook.getWorksheet('Clearance Summary')?.getImages().length ?? 0) >= 2);
  });

  void it('produces a valid document when optional remote media is unavailable', async () => {
    const service = new ClearanceExportService({ resolveImage: async () => undefined });
    const pdf = await service.pdf(clearanceExportFixture, { universityId: 'university-id' });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  });
});

void describe('analytics report artifacts', () => {
  const report: AnalyticsReport = {
    reportId: 'ATR-20260812-DEMO',
    title: 'University Attendance Report',
    scope: 'university',
    generatedAt: '2026-08-12T12:00:00.000Z',
    generatedBy: 'Admin User',
    branding: { universityName: 'Attendity University', displayName: 'Attendity University' },
    verification: {
      source: 'live-attendance-data',
      checksum: 'a'.repeat(64),
      verifiedAt: '2026-08-12T12:00:00.000Z',
    },
    filters: { from: '2026-08-01', to: '2026-08-12' },
    summary: {
      totalSessions: 20,
      totalCheckIns: 320,
      averageAttendance: 80,
      activeSessions: 1,
      registeredStudents: 40,
    },
    rows: [
      {
        id: 'student:course',
        studentName: 'Ada Okafor',
        registrationNumber: 'ATD/CSC/001',
        courseCode: 'CSC 401',
        courseTitle: 'Systems Analysis',
        sessionsHeld: 10,
        sessionsAttended: 8,
        attendanceRate: 80,
        requiredAttendance: 75,
        riskLevel: 'low',
        latestAttendanceAt: '2026-08-11T09:05:00.000Z',
      },
    ],
    pagination: { page: 1, limit: 25, total: 1, pages: 1 },
  };

  void it('creates branded PDF, spreadsheet, and institution-identified CSV output', async () => {
    const service = new AnalyticsExportService();
    const logo = { buffer: png, mimeType: 'image/png' as const, source: 'asset' as const };
    const pdf = await service.pdf(report, logo);
    const xlsx = await service.excel(report, logo);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsx as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const csv = service.csv(report).toString('utf8');

    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok((workbook.getWorksheet('Attendance Report')?.getImages().length ?? 0) >= 1);
    assert.match(csv, /Attendity University/);
  });

  void it('exports the full filtered period and latest attendance across every format', async () => {
    const service = new AnalyticsExportService();
    const longReport: AnalyticsReport = {
      ...report,
      rows: Array.from({ length: 30 }, (_, index) => ({
        ...report.rows[0]!,
        id: `student-${index + 1}:course`,
        studentName: `Student ${String(index + 1).padStart(2, '0')}`,
        registrationNumber: `ATD/CSC/${String(index + 1).padStart(3, '0')}`,
      })),
      pagination: { page: 1, limit: 30, total: 30, pages: 1 },
    };

    const csv = service.csv(longReport).toString('utf8');
    const xlsx = await service.excel(longReport);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsx as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet('Attendance Report');
    const pdf = await service.pdf(longReport);
    const pdfPages = pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;

    assert.match(csv, /Reporting period,2026-08-01 to 2026-08-12/);
    assert.match(csv, /Latest attendance/);
    assert.match(csv, /2026-08-11T09:05:00.000Z/);
    assert.match(csv, /Student 30/);
    assert.ok(sheet);
    assert.equal(sheet.getCell('A3').value, 'Reporting period');
    assert.equal(sheet.getCell('B3').value, '2026-08-01 to 2026-08-12');
    assert.ok(sheet.getRow(6).values.includes('Latest attendance'));
    assert.equal(sheet.getRow(36).getCell(1).value, 'Student 30');
    assert.ok(pdfPages >= 2);
  });
});
