import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import ExcelJS from 'exceljs';
import { clearanceExportFixture } from './clearance-export.fixture.js';

process.env.MONGODB_URI = 'mongodb://localhost:27017/attendity_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.REPORT_SIGNING_SECRET = 'test-report-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';

void describe('exam eligibility and report integrity', () => {
  void it('uses stable eligible, not eligible, and pending decisions', async () => {
    const { decideEligibility } = await import('../src/services/clearance.service.js');
    assert.deepEqual(decideEligibility(0, 0, 75), {
      attendancePercentage: 0,
      decision: 'pending',
    });
    assert.equal(decideEligibility(3, 4, 75).decision, 'eligible');
    assert.equal(decideEligibility(2, 4, 75).decision, 'not_eligible');
    assert.equal(decideEligibility(2, 3, 66.66).attendancePercentage, 66.67);
  });

  void it('creates deterministic checksums independent of object key order', async () => {
    const { checksum } = await import('../src/services/clearance.service.js');
    assert.equal(checksum({ b: 2, a: 1 }), checksum({ a: 1, b: 2 }));
    assert.notEqual(checksum({ a: 1 }), checksum({ a: 2 }));
  });

  void it('validates report generation, archive pagination, and revocation reasons', async () => {
    const { clearanceArchiveQuerySchema, generateClearanceSchema, revokeClearanceSchema } =
      await import('../src/validators/clearance.validator.js');
    assert.equal(
      generateClearanceSchema.safeParse({
        body: { courseId: '66a333333333333333333333' },
      }).success,
      true,
    );
    assert.equal(
      clearanceArchiveQuerySchema.safeParse({ query: { page: 0, limit: 500 } }).success,
      false,
    );
    assert.equal(
      revokeClearanceSchema.safeParse({
        params: { reportId: 'ACL-20260731-A1B2C3D4E5' },
        body: { reason: 'short' },
      }).success,
      false,
    );
  });

  void it('enforces one valid report per student and course and protects secrets', async () => {
    const { ClearanceReportModel } = await import('../src/models/clearance-report.model.js');
    const validIndex = ClearanceReportModel.schema
      .indexes()
      .find(
        ([fields, options]) =>
          fields.universityId === 1 &&
          fields.studentId === 1 &&
          fields.courseId === 1 &&
          fields.status === 1 &&
          options.unique === true,
      );
    assert.ok(validIndex);
    assert.equal(ClearanceReportModel.schema.path('digitalSignature')?.options.select, false);
    assert.equal(ClearanceReportModel.schema.path('verificationTokenHash')?.options.select, false);
  });

  void it('signs the exact clearance statistics shape preserved by Mongoose', async () => {
    const service = await import('../src/services/clearance.service.js');
    const { ClearanceReportModel } = await import('../src/models/clearance-report.model.js');
    assert.equal(typeof service.snapshotStatistics, 'function');
    assert.equal(typeof service.reportIntegrityMatches, 'function');
    const eligibility = {
      registrationId: '66a111111111111111111111',
      registrationNumber: 'ATD/CSC/2026/001-CSC405',
      courseId: '66a222222222222222222222',
      courseCode: 'CSC 405',
      courseTitle: 'Computer Science: Research and Innovation',
      sessionsHeld: 16,
      present: 16,
      late: 0,
      absent: 0,
      excused: 0,
      attendancePercentage: 100,
      requiredPercentage: 75,
      attendanceScore: 100,
      currentStreak: 16,
      decision: 'eligible' as const,
      calculatedAt: '2026-08-12T13:00:00.000Z',
    };
    const statistics = service.snapshotStatistics(eligibility);
    assert.deepEqual(Object.keys(statistics).sort(), [
      'absent',
      'attendancePercentage',
      'attendanceScore',
      'calculatedAt',
      'currentStreak',
      'decision',
      'excused',
      'late',
      'present',
      'requiredPercentage',
      'sessionsHeld',
    ]);
    const issuedAt = new Date('2026-08-12T13:01:00.000Z');
    const sourceDataHash = 'a'.repeat(64);
    const snapshot = {
      university: {
        name: 'Lagos Metropolitan University',
        logoAssetId: '66a444444444444444444444',
      },
      faculty: 'Science and Technology',
      department: 'Computer Science',
      student: {
        id: '66a333333333333333333333',
        name: 'Chidi Nwankwo',
        matricNumber: 'ATD/CSC/2026/001',
        photoAssetId: '66a555555555555555555555',
        programme: 'BSc Computer Science',
        level: '100 Level',
      },
      academicSession: '2026/2027',
      semester: 'First Semester',
      course: {
        id: eligibility.courseId,
        code: eligibility.courseCode,
        title: eligibility.courseTitle,
      },
      courseRegistrationConfirmed: true,
      statistics,
    };
    const payload = {
      reportId: 'ACL-20260812-A1B2C3D4E5',
      version: 2,
      issuedAt,
      snapshot,
      sourceDataHash,
    };
    const reportChecksum = service.checksum(payload);
    const report = ClearanceReportModel.hydrate({
      ...payload,
      checksum: reportChecksum,
      digitalSignature: createHmac('sha256', process.env.REPORT_SIGNING_SECRET!)
        .update(reportChecksum)
        .digest('base64url'),
    });

    assert.equal(service.reportIntegrityMatches(report), true);
  });

  void it('does not reuse a current report whose persisted snapshot fails integrity', async () => {
    const service = await import('../src/services/clearance.service.js');
    const { ClearanceReportModel } = await import('../src/models/clearance-report.model.js');
    assert.equal(typeof service.canReuseReport, 'function');
    const sourceDataHash = 'b'.repeat(64);
    const issuedAt = new Date('2026-08-12T13:05:00.000Z');
    const expandedStatistics = {
      registrationId: '66a111111111111111111111',
      registrationNumber: 'ATD/CSC/2026/001-CSC405',
      courseId: '66a222222222222222222222',
      courseCode: 'CSC 405',
      courseTitle: 'Computer Science: Research and Innovation',
      sessionsHeld: 16,
      present: 16,
      late: 0,
      absent: 0,
      excused: 0,
      attendancePercentage: 100,
      requiredPercentage: 75,
      attendanceScore: 100,
      currentStreak: 16,
      decision: 'eligible' as const,
      calculatedAt: '2026-08-12T13:04:00.000Z',
    };
    const snapshot = {
      university: { name: 'Lagos Metropolitan University' },
      faculty: 'Science and Technology',
      department: 'Computer Science',
      student: {
        id: '66a333333333333333333333',
        name: 'Chidi Nwankwo',
        matricNumber: 'ATD/CSC/2026/001',
        programme: 'BSc Computer Science',
        level: '100 Level',
      },
      academicSession: '2026/2027',
      semester: 'First Semester',
      course: {
        id: expandedStatistics.courseId,
        code: expandedStatistics.courseCode,
        title: expandedStatistics.courseTitle,
      },
      courseRegistrationConfirmed: true,
      statistics: expandedStatistics,
    };
    const expandedPayload = {
      reportId: 'ACL-20260812-B1C2D3E4F5',
      version: 1,
      issuedAt,
      snapshot,
      sourceDataHash,
    };
    const invalidChecksum = service.checksum(expandedPayload);
    const invalidReport = ClearanceReportModel.hydrate({
      ...expandedPayload,
      checksum: invalidChecksum,
      digitalSignature: createHmac('sha256', process.env.REPORT_SIGNING_SECRET!)
        .update(invalidChecksum)
        .digest('base64url'),
    });
    assert.equal(service.canReuseReport(invalidReport, sourceDataHash), false);

    const canonicalSnapshot = {
      ...snapshot,
      statistics: service.snapshotStatistics(expandedStatistics),
    };
    const canonicalPayload = { ...expandedPayload, snapshot: canonicalSnapshot };
    const validChecksum = service.checksum(canonicalPayload);
    const validReport = ClearanceReportModel.hydrate({
      ...canonicalPayload,
      checksum: validChecksum,
      digitalSignature: createHmac('sha256', process.env.REPORT_SIGNING_SECRET!)
        .update(validChecksum)
        .digest('base64url'),
    });
    assert.equal(service.canReuseReport(validReport, sourceDataHash), true);
  });
});

void describe('professional clearance exports', () => {
  void it('generates a real A4 PDF containing report metadata', async () => {
    const { clearanceExportService } = await import('../src/services/clearance-export.service.js');
    const pdf = await clearanceExportService.pdf(clearanceExportFixture);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 10_000);
    assert.equal(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length, 1);
  });

  void it('generates a formatted Excel workbook with summary and verification sheets', async () => {
    const { clearanceExportService } = await import('../src/services/clearance-export.service.js');
    const output = await clearanceExportService.excel(clearanceExportFixture);
    const workbook = new ExcelJS.Workbook();
    const excelInput = output as unknown as Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(excelInput);
    assert.deepEqual(
      workbook.worksheets.map((sheet) => sheet.name),
      ['Clearance Summary', 'Verification Data'],
    );
    const summary = workbook.getWorksheet('Clearance Summary');
    assert.equal(summary?.getCell('A1').value, clearanceExportFixture.university.name);
    assert.equal(summary?.getCell('B5').value, clearanceExportFixture.reportId);
    assert.equal(summary?.views[0]?.state, 'frozen');
    assert.equal(summary?.pageSetup.fitToWidth, 1);
  });

  void it('generates RFC-compatible CSV with verification metadata', async () => {
    const { clearanceExportService } = await import('../src/services/clearance-export.service.js');
    const csv = clearanceExportService.csv(clearanceExportFixture).toString('utf8');
    assert.match(csv, /Report ID,ACL-20260731-A1B2C3D4E5/);
    assert.match(csv, /Verification URL/);
    assert.match(csv, /Digital Signature/);
    assert.ok(csv.startsWith('\uFEFF'));
  });
});
