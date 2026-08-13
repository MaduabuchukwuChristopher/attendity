import type { EventAnalytics, EventSummary } from '@qr/types';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface EventExportBranding {
  readonly institutionName: string;
  readonly logo?: { readonly buffer: Buffer; readonly mimeType: 'image/png' | 'image/jpeg' };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export class EventExportService {
  csv(event: EventSummary, analytics: EventAnalytics, branding?: EventExportBranding): Buffer {
    const metrics: ReadonlyArray<readonly [string, string | number]> = [
      ...(branding ? ([['Institution', branding.institutionName]] as const) : []),
      ['Event', event.title],
      ['Event type', event.eventType],
      ['Organizer', event.organizerName],
      ['Venue', event.venue],
      ['Starts at', event.startsAt],
      ['Ends at', event.endsAt],
      ['Mandatory', event.mandatory ? 'Yes' : 'No'],
      ['Invited', analytics.invited],
      ['Registered', analytics.registered],
      ['Attended', analytics.attended],
      ['Absent', analytics.absent],
      ['Late', analytics.late],
      ['Excused', analytics.excused],
      ['Rejected', analytics.rejected],
      ['Pending', analytics.pending],
      ['Attendance rate', `${analytics.attendanceRate}%`],
      ['Mandatory compliance', `${analytics.mandatoryCompliance}%`],
      ['Peak arrival period', analytics.peakArrivalPeriod?.period ?? 'No arrivals'],
      ['GPS failures', analytics.verificationFailures.gps],
      ['Face-verification failures', analytics.verificationFailures.face],
      ['Credential failures', analytics.verificationFailures.credential],
      ['Duplicate attempts', analytics.verificationFailures.duplicate],
      ['Suspicious attempts', analytics.verificationFailures.suspicious],
      ...analytics.verificationMethods.map(
        (item) => [`Verification: ${item.method}`, item.count] as const,
      ),
    ];
    const content = [['Metric', 'Value'], ...metrics]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    return Buffer.from(`\uFEFF${content}\r\n`, 'utf8');
  }

  async excel(
    event: EventSummary,
    analytics: EventAnalytics,
    branding?: EventExportBranding,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = branding?.institutionName ?? 'Attendity';
    workbook.title = `${event.title} attendance analytics`;
    const sheet = workbook.addWorksheet('Event Analytics', {
      views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    });
    sheet.columns = [
      { key: 'metric', width: 34 },
      { key: 'value', width: 34 },
    ];
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = event.title;
    sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    if (branding?.logo) {
      const logoId = workbook.addImage({
        buffer: branding.logo.buffer as unknown as ArrayBuffer,
        extension: branding.logo.mimeType === 'image/jpeg' ? 'jpeg' : 'png',
      });
      sheet.addImage(logoId, { tl: { col: 0.05, row: 0.05 }, ext: { width: 42, height: 42 } });
    }
    sheet.mergeCells('A2:B2');
    sheet.getCell('A2').value =
      `${event.venue} · ${new Date(event.startsAt).toLocaleString('en-NG')}`;
    sheet.addRow([]);
    sheet.addRow(['Metric', 'Value']);
    const rows = [
      ['Invited', analytics.invited],
      ['Registered', analytics.registered],
      ['Attended', analytics.attended],
      ['Absent', analytics.absent],
      ['Late', analytics.late],
      ['Excused', analytics.excused],
      ['Rejected', analytics.rejected],
      ['Pending', analytics.pending],
      ['Attendance rate', analytics.attendanceRate / 100],
      ['Mandatory compliance', analytics.mandatoryCompliance / 100],
      ['GPS failures', analytics.verificationFailures.gps],
      ['Face-verification failures', analytics.verificationFailures.face],
      ['Credential failures', analytics.verificationFailures.credential],
      ['Duplicate attempts', analytics.verificationFailures.duplicate],
      ['Suspicious attempts', analytics.verificationFailures.suspicious],
      ...analytics.verificationMethods.map((item) => [`Verification: ${item.method}`, item.count]),
    ];
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
    sheet.getColumn(1).font = { bold: true };
    sheet.getCell('B13').numFmt = '0.0%';
    sheet.getCell('B14').numFmt = '0.0%';
    const timeline = workbook.addWorksheet('Check-in Timeline');
    timeline.columns = [
      { header: 'Period', key: 'period', width: 28 },
      { header: 'Check-ins', key: 'count', width: 16 },
    ];
    analytics.checkInTimeline.forEach((item) => timeline.addRow(item));
    timeline.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    timeline.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
    const addBreakdownSheet = (
      name: string,
      rows: EventAnalytics['attendanceByInstitutionUnit'],
    ) => {
      const breakdown = workbook.addWorksheet(name);
      breakdown.columns = [
        { header: 'Group', key: 'label', width: 42 },
        { header: 'Invited', key: 'invited', width: 14 },
        { header: 'Attended', key: 'attended', width: 14 },
        { header: 'Attendance rate', key: 'attendanceRate', width: 20 },
      ];
      rows.forEach((item) =>
        breakdown.addRow({ ...item, attendanceRate: item.attendanceRate / 100 }),
      );
      breakdown.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      breakdown.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF14532D' },
      };
      breakdown.getColumn(4).numFmt = '0.0%';
    };
    addBreakdownSheet('Institution Units', analytics.attendanceByInstitutionUnit);
    addBreakdownSheet('Programmes', analytics.attendanceByProgramme);
    addBreakdownSheet('Levels', analytics.attendanceByLevel);
    addBreakdownSheet('Roles', analytics.attendanceByRole);
    const comparison = workbook.addWorksheet('Event Comparison');
    comparison.columns = [
      { header: 'Event', key: 'title', width: 42 },
      { header: 'Date', key: 'startsAt', width: 24 },
      { header: 'Attendance rate', key: 'attendanceRate', width: 20 },
    ];
    analytics.eventComparison.forEach((item) =>
      comparison.addRow({ ...item, attendanceRate: item.attendanceRate / 100 }),
    );
    comparison.getColumn(3).numFmt = '0.0%';
    const semesters = workbook.addWorksheet('Semester Summary');
    semesters.columns = [
      { header: 'Academic session', key: 'academicSession', width: 26 },
      { header: 'Term', key: 'term', width: 24 },
      { header: 'Invited', key: 'invited', width: 14 },
      { header: 'Attended', key: 'attended', width: 14 },
      { header: 'Attendance rate', key: 'attendanceRate', width: 20 },
    ];
    analytics.semesterParticipation.forEach((item) =>
      semesters.addRow({ ...item, attendanceRate: item.attendanceRate / 100 }),
    );
    semesters.getColumn(5).numFmt = '0.0%';
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  pdf(
    event: EventSummary,
    analytics: EventAnalytics,
    branding?: EventExportBranding,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A4',
        margins: { top: 42, left: 42, right: 42, bottom: 42 },
        info: {
          Title: `${event.title} attendance analytics`,
          Author: branding?.institutionName ?? 'Attendity',
        },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.rect(0, 0, document.page.width, 110).fill('#14532D');
      if (branding?.logo) {
        try {
          document.image(branding.logo.buffer, document.page.width - 96, 26, {
            fit: [54, 54],
            align: 'center',
            valign: 'center',
          });
        } catch {
          // Text branding below remains available when an optional image cannot render.
        }
      }
      document
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('ATTENDITY EVENT ANALYTICS', 42, 34, { width: document.page.width - 160 });
      document.font('Helvetica').fontSize(11).text(event.title, 42, 66);
      if (branding)
        document.fontSize(8).text(branding.institutionName, 42, 84, {
          width: document.page.width - 160,
        });
      document
        .fillColor('#17201A')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('Attendance summary', 42, 140);
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#5F6F65')
        .text(`${event.venue} · ${new Date(event.startsAt).toLocaleString('en-NG')}`, 42, 166);
      const metrics: ReadonlyArray<readonly [string, string | number]> = [
        ['Invited', analytics.invited],
        ['Registered', analytics.registered],
        ['Attended', analytics.attended],
        ['Absent', analytics.absent],
        ['Late', analytics.late],
        ['Excused', analytics.excused],
        ['Rejected', analytics.rejected],
        ['Pending', analytics.pending],
        ['Attendance rate', `${analytics.attendanceRate}%`],
        ['Mandatory compliance', `${analytics.mandatoryCompliance}%`],
        ['Verification failures', analytics.verificationFailures.total],
        ['Duplicate attempts', analytics.verificationFailures.duplicate],
        ['Suspicious attempts', analytics.verificationFailures.suspicious],
      ];
      let y = 205;
      metrics.forEach(([name, value], index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 42 + column * 255;
        const metricY = y + row * 52;
        document.roundedRect(x, metricY, 235, 40, 7).fill('#F0FDF4');
        document
          .fillColor('#5F6F65')
          .font('Helvetica')
          .fontSize(8)
          .text(name.toUpperCase(), x + 12, metricY + 9);
        document
          .fillColor('#14532D')
          .font('Helvetica-Bold')
          .fontSize(13)
          .text(String(value), x + 12, metricY + 21);
      });
      y += 295;
      document
        .fillColor('#17201A')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('Verification distribution', 42, y);
      document
        .fillColor('#5F6F65')
        .font('Helvetica')
        .fontSize(10)
        .text(
          analytics.verificationMethods
            .map((item) => `${item.method.replaceAll('_', ' ')}: ${item.count}`)
            .join('  ·  ') || 'No verified check-ins yet.',
          42,
          y + 25,
          { width: 510 },
        );
      document
        .fillColor('#5F6F65')
        .fontSize(8)
        .text(
          `Generated ${new Date(analytics.generatedAt).toLocaleString('en-NG')} from live tenant-scoped attendance data.`,
          42,
          770,
          { width: 510, align: 'center' },
        );
      document.end();
    });
  }
}

export const eventExportService = new EventExportService();
