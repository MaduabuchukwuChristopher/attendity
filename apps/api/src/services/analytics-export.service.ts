import type { AnalyticsReport } from '@qr/types';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { ResolvedImage } from './trusted-media.service.js';

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function reportPeriod(report: AnalyticsReport): string {
  return `${String(report.filters.from)} to ${String(report.filters.to)}`;
}

function latestAttendance(value?: string): string {
  return value ? value : 'No check-in';
}

export class AnalyticsExportService {
  async pdf(report: AnalyticsReport, logo?: ResolvedImage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A4',
        margins: { top: 42, right: 42, bottom: 42, left: 42 },
        info: { Title: report.title, Author: report.branding.displayName },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.rect(0, 0, document.page.width, 116).fill('#0B2638');
      if (logo) {
        try {
          document.image(logo.buffer, document.page.width - 98, 28, { fit: [56, 56] });
        } catch {
          // Text branding remains visible.
        }
      }
      document
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(report.title, 42, 30, {
          width: document.page.width - 160,
        });
      document.font('Helvetica').fontSize(9).text(report.branding.displayName, 42, 62);
      document
        .fillColor('#D4AA48')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(report.reportId, 42, 82);
      document
        .fillColor('#14532D')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`Reporting period: ${reportPeriod(report)}`, 42, 122);
      const metrics = [
        ['Sessions', report.summary.totalSessions],
        ['Verified check-ins', report.summary.totalCheckIns],
        ['Average attendance', `${report.summary.averageAttendance}%`],
        ['Registered students', report.summary.registeredStudents],
      ] as const;
      let y = 148;
      for (const [label, value] of metrics) {
        document.roundedRect(42, y, 245, 42, 8).fill('#EAF5EF');
        document
          .fillColor('#14532D')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(label, 54, y + 8);
        document
          .fillColor('#17201A')
          .fontSize(13)
          .text(String(value), 190, y + 8, { width: 80, align: 'right' });
        y += 50;
      }
      y += 10;
      const drawContinuationHeader = () => {
        document.rect(0, 0, document.page.width, 78).fill('#0B2638');
        document
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(14)
          .text(report.title, 42, 24, { width: document.page.width - 84 });
        document
          .fillColor('#D4AA48')
          .fontSize(8)
          .text(`${report.branding.displayName} · ${reportPeriod(report)}`, 42, 50);
      };
      const drawTableHeader = (top: number) => {
        document.roundedRect(42, top, document.page.width - 84, 24, 5).fill('#14532D');
        document.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);
        document.text('STUDENT', 50, top + 8, { width: 155 });
        document.text('COURSE', 210, top + 8, { width: 72 });
        document.text('SESSIONS', 286, top + 8, { width: 55, align: 'center' });
        document.text('RATE', 345, top + 8, { width: 45, align: 'center' });
        document.text('LATEST ATTENDANCE', 394, top + 8, { width: 151, align: 'right' });
        return top + 30;
      };
      const drawFooter = () => {
        document
          .fillColor('#5F6F65')
          .font('Helvetica')
          .fontSize(6)
          .text(
            `Verified checksum: ${report.verification.checksum}`,
            42,
            document.page.height - 34,
            {
              width: document.page.width - 84,
              align: 'center',
              lineBreak: false,
            },
          );
      };
      document
        .fillColor('#17201A')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Attendance records', 42, y);
      y = drawTableHeader(y + 20);
      for (const row of report.rows) {
        if (y + 34 > document.page.height - 48) {
          drawFooter();
          document.addPage();
          drawContinuationHeader();
          y = drawTableHeader(92);
        }
        document
          .fillColor('#17201A')
          .font('Helvetica-Bold')
          .fontSize(7)
          .text(row.studentName, 50, y + 2, { width: 155, ellipsis: true });
        document
          .fillColor('#5F6F65')
          .font('Helvetica')
          .fontSize(6)
          .text(row.registrationNumber, 50, y + 13, { width: 155, ellipsis: true });
        document
          .fillColor('#1D4ED8')
          .font('Helvetica-Bold')
          .fontSize(7)
          .text(row.courseCode, 210, y + 8, { width: 72 });
        document
          .fillColor('#14532D')
          .text(`${row.sessionsAttended}/${row.sessionsHeld}`, 286, y + 8, {
            width: 55,
            align: 'center',
          });
        document.text(`${row.attendanceRate}%`, 345, y + 8, { width: 45, align: 'center' });
        document
          .fillColor('#334155')
          .font('Helvetica')
          .fontSize(6)
          .text(latestAttendance(row.latestAttendanceAt), 394, y + 8, {
            width: 151,
            align: 'right',
            ellipsis: true,
          });
        document
          .moveTo(42, y + 29)
          .lineTo(document.page.width - 42, y + 29)
          .strokeColor('#D7E1DA')
          .stroke();
        y += 34;
      }
      drawFooter();
      document.end();
    });
  }

  async excel(report: AnalyticsReport, logo?: ResolvedImage): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = report.branding.displayName;
    const sheet = workbook.addWorksheet('Attendance Report', {
      views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    });
    sheet.columns = [
      { key: 'student', width: 28 },
      { key: 'registration', width: 22 },
      { key: 'course', width: 34 },
      { key: 'sessions', width: 16 },
      { key: 'attendance', width: 18 },
      { key: 'required', width: 16 },
      { key: 'risk', width: 14 },
      { key: 'latest', width: 27 },
    ];
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = report.branding.displayName;
    sheet.getCell('A1').font = { bold: true, size: 17, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2638' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = `${report.title} · ${report.reportId}`;
    sheet.addRow(['Reporting period', reportPeriod(report)]);
    sheet.addRow([]);
    sheet.addRow([
      'Sessions',
      report.summary.totalSessions,
      'Verified check-ins',
      report.summary.totalCheckIns,
      'Average attendance',
      report.summary.averageAttendance / 100,
    ]);
    sheet.addRow([
      'Student',
      'Registration',
      'Course',
      'Sessions',
      'Attendance',
      'Required',
      'Risk',
      'Latest attendance',
    ]);
    for (const row of report.rows)
      sheet.addRow([
        row.studentName,
        row.registrationNumber,
        `${row.courseCode} — ${row.courseTitle}`,
        `${row.sessionsAttended}/${row.sessionsHeld}`,
        row.attendanceRate / 100,
        row.requiredAttendance / 100,
        row.riskLevel,
        latestAttendance(row.latestAttendanceAt),
      ]);
    sheet.getRow(6).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
    sheet.getColumn(5).numFmt = '0.0%';
    sheet.getColumn(6).numFmt = '0.0%';
    if (logo) {
      const imageId = workbook.addImage({
        buffer: logo.buffer as unknown as ArrayBuffer,
        extension: logo.mimeType === 'image/jpeg' ? 'jpeg' : 'png',
      });
      sheet.addImage(imageId, { tl: { col: 0.05, row: 0.05 }, ext: { width: 42, height: 42 } });
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  csv(report: AnalyticsReport): Buffer {
    const rows: Array<readonly (string | number)[]> = [
      ['Institution', report.branding.displayName],
      ['Report ID', report.reportId],
      ['Report title', report.title],
      ['Generated at', report.generatedAt],
      ['Reporting period', reportPeriod(report)],
      [],
      [
        'Student',
        'Registration',
        'Course code',
        'Course title',
        'Sessions held',
        'Sessions attended',
        'Attendance rate',
        'Required attendance',
        'Risk',
        'Latest attendance',
      ],
      ...report.rows.map((row) => [
        row.studentName,
        row.registrationNumber,
        row.courseCode,
        row.courseTitle,
        row.sessionsHeld,
        row.sessionsAttended,
        row.attendanceRate,
        row.requiredAttendance,
        row.riskLevel,
        latestAttendance(row.latestAttendanceAt),
      ]),
    ];
    return Buffer.from(
      `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`,
      'utf8',
    );
  }
}

export const analyticsExportService = new AnalyticsExportService();
