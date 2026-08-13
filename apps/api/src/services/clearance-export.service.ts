import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { ClearanceReportDetail } from '@qr/types';
import {
  trustedMediaService,
  type ResolvedImage,
  type TrustedMediaService,
} from './trusted-media.service.js';

const FOREST = '#14532D';
const FOREST_LIGHT = '#DCFCE7';
const INK = '#17201A';
const MUTED = '#5F6F65';
const LINE = '#D7E1DA';

function dataImage(value?: string): Buffer | undefined {
  if (!value) return undefined;
  const match = /^data:image\/(?:png|jpeg);base64,(.+)$/i.exec(value);
  return match?.[1] ? Buffer.from(match[1], 'base64') : undefined;
}

function decisionLabel(report: ClearanceReportDetail): string {
  return report.decision === 'eligible'
    ? 'APPROVED - ELIGIBLE FOR EXAMINATION'
    : report.decision === 'pending'
      ? 'PENDING'
      : 'NOT ELIGIBLE';
}

function csvCell(value: string | number | boolean): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export class ClearanceExportService {
  constructor(
    private readonly media: Pick<TrustedMediaService, 'resolveImage'> = trustedMediaService,
  ) {}

  private async images(
    report: ClearanceReportDetail,
    universityId?: string,
  ): Promise<{ readonly logo?: ResolvedImage; readonly headshot?: ResolvedImage }> {
    if (!universityId) return {};
    const [logo, headshot] = await Promise.all([
      this.media.resolveImage({
        universityId,
        ...(report.university.logoAssetId ? { assetId: report.university.logoAssetId } : {}),
        ...(report.university.logoUrl ? { snapshotUrl: report.university.logoUrl } : {}),
        contexts: ['institution_logo'],
      }),
      this.media.resolveImage({
        universityId,
        ...(report.student.photoAssetId ? { assetId: report.student.photoAssetId } : {}),
        ...(report.student.photoUrl ? { snapshotUrl: report.student.photoUrl } : {}),
        contexts: ['profile'],
      }),
    ]);
    return {
      ...(logo ? { logo } : {}),
      ...(headshot ? { headshot } : {}),
    };
  }

  async pdf(
    report: ClearanceReportDetail,
    context?: { readonly universityId: string },
  ): Promise<Buffer> {
    const qr = await QRCode.toBuffer(report.verificationUrl, {
      type: 'png',
      width: 420,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: FOREST, light: '#FFFFFF' },
    });
    const images = await this.images(report, context?.universityId);
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 42, right: 42, bottom: 20, left: 42 },
        info: {
          Title: `Attendance Clearance ${report.reportId}`,
          Author: report.university.name,
          Subject: 'Examination attendance clearance',
          Keywords: 'attendance, clearance, examination, verification',
          CreationDate: new Date(report.issuedAt),
        },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth = document.page.width;
      const contentWidth = pageWidth - 84;
      document.save().fillColor(FOREST).opacity(0.055);
      document.font('Helvetica-Bold').fontSize(58);
      document.rotate(-32, { origin: [pageWidth / 2, 410] });
      document.text(
        report.status === 'valid' ? 'VERIFIED CLEARANCE' : report.status.toUpperCase(),
        35,
        380,
        {
          width: 530,
          align: 'center',
        },
      );
      document.restore();

      document.rect(0, 0, pageWidth, 112).fill(FOREST);
      const logo = images.logo?.buffer ?? dataImage(report.university.logoUrl);
      if (logo) {
        try {
          document.image(logo, 42, 26, { fit: [58, 58], align: 'center', valign: 'center' });
        } catch {
          document.roundedRect(42, 26, 58, 58, 12).fill('#FFFFFF');
          document.fillColor(FOREST).font('Helvetica-Bold').fontSize(24).text('U', 42, 43, {
            width: 58,
            align: 'center',
          });
        }
      } else {
        document.roundedRect(42, 26, 58, 58, 12).fill('#FFFFFF');
        document.fillColor(FOREST).font('Helvetica-Bold').fontSize(24).text('U', 42, 43, {
          width: 58,
          align: 'center',
        });
      }
      document
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(report.university.name, 116, 28, { width: contentWidth - 74 });
      document
        .font('Helvetica')
        .fontSize(9)
        .text(`${report.faculty} | ${report.department}`, 116, 53, { width: contentWidth - 74 });
      document
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ATTENDANCE CLEARANCE REPORT', 116, 73, { width: contentWidth - 74 });

      document
        .fillColor(INK)
        .font('Helvetica-Bold')
        .fontSize(18)
        .text('Examination clearance', 42, 134);
      document
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(9)
        .text(`Report ID: ${report.reportId}  |  Version: ${report.version}`, 42, 160);

      const headshot = images.headshot?.buffer ?? dataImage(report.student.photoUrl);
      document.roundedRect(431, 128, 80, 94, 8).lineWidth(1).strokeColor(LINE).stroke();
      if (headshot) {
        try {
          document.image(headshot, 435, 132, { fit: [72, 86], align: 'center', valign: 'center' });
        } catch {
          document.fillColor(MUTED).fontSize(8).text('Photo unavailable', 437, 171, {
            width: 68,
            align: 'center',
          });
        }
      } else {
        document.fillColor(MUTED).fontSize(8).text('No photo on file', 437, 171, {
          width: 68,
          align: 'center',
        });
      }

      const detailRows: ReadonlyArray<readonly [string, string]> = [
        ['Student name', report.student.name],
        ['Matric number', report.student.matricNumber],
        ['Programme / Level', `${report.student.programme} / ${report.student.level}`],
        ['Academic period', `${report.academicSession} - ${report.semester}`],
        ['Course', `${report.course.code} - ${report.course.title}`],
        ['Registration', `${report.registrationNumber} - Confirmed`],
      ];
      let y = 190;
      for (const [label, value] of detailRows) {
        document.fillColor(MUTED).font('Helvetica').fontSize(8).text(label.toUpperCase(), 42, y);
        document
          .fillColor(INK)
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(value, 155, y - 1, { width: 260 });
        document
          .moveTo(42, y + 15)
          .lineTo(415, y + 15)
          .strokeColor(LINE)
          .lineWidth(0.6)
          .stroke();
        y += 29;
      }

      const tableY = 380;
      document.roundedRect(42, tableY, contentWidth, 116, 10).fill('#F7FAF8');
      document
        .fillColor(FOREST)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Attendance statistics', 58, tableY + 15);
      const metrics: ReadonlyArray<readonly [string, string]> = [
        ['Sessions', String(report.statistics.sessionsHeld)],
        ['Present', String(report.statistics.present)],
        ['Late', String(report.statistics.late)],
        ['Absent', String(report.statistics.absent)],
        ['Excused', String(report.statistics.excused)],
        ['Streak', String(report.statistics.currentStreak)],
        ['Attendance', `${report.statistics.attendancePercentage}%`],
        ['Required', `${report.statistics.requiredPercentage}%`],
        ['Score', `${report.statistics.attendanceScore}%`],
      ];
      const columnWidth = contentWidth / 3;
      metrics.forEach(([label, value], index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const x = 58 + column * columnWidth;
        const metricY = tableY + 42 + row * 23;
        document.fillColor(MUTED).font('Helvetica').fontSize(8).text(label, x, metricY);
        document
          .fillColor(INK)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(value, x + 68, metricY - 1);
      });

      document.roundedRect(42, 514, contentWidth, 56, 10).fill(FOREST_LIGHT);
      document
        .fillColor(FOREST)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(decisionLabel(report), 58, 529, { width: contentWidth - 32, align: 'center' });
      document
        .font('Helvetica')
        .fontSize(8)
        .text(
          `Attendance ${report.statistics.attendancePercentage}% | Requirement ${report.statistics.requiredPercentage}%`,
          58,
          548,
          { width: contentWidth - 32, align: 'center' },
        );

      document.image(qr, 42, 592, { fit: [110, 110] });
      document
        .fillColor(INK)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('SERVER VERIFICATION', 166, 597);
      document
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Scan this QR code to verify the report against the live university record. A printed decision must never be accepted without successful server verification.',
          166,
          616,
          { width: 215, lineGap: 2 },
        );
      document
        .font('Courier')
        .fontSize(6.5)
        .text(`Checksum: ${report.checksum}`, 166, 666, { width: 215 });

      document.moveTo(397, 675).lineTo(511, 675).strokeColor(INK).lineWidth(0.8).stroke();
      document
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(8)
        .text('Authorized signature', 397, 681, {
          width: 114,
          align: 'center',
        });
      document.text(`Issued: ${new Date(report.issuedAt).toLocaleString('en-NG')}`, 397, 704, {
        width: 114,
        align: 'center',
      });

      document.rect(0, 760, pageWidth, 82).fill(FOREST);
      document
        .fillColor('#FFFFFF')
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          `Digitally signed: ${report.digitalSignature}  |  Status: ${report.status.toUpperCase()}`,
          42,
          773,
          { width: contentWidth, align: 'center' },
        );
      document.text(
        'This clearance is valid only while its server record remains valid. Attendance changes automatically expire it.',
        42,
        792,
        { width: contentWidth, align: 'center' },
      );
      document.text('Page 1 of 1', 42, 810, { width: contentWidth, align: 'center' });
      document.end();
    });
  }

  async excel(
    report: ClearanceReportDetail,
    context?: { readonly universityId: string },
  ): Promise<Buffer> {
    const images = await this.images(report, context?.universityId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = report.university.name;
    workbook.created = new Date(report.issuedAt);
    workbook.subject = 'Examination attendance clearance';
    workbook.title = `Attendance Clearance ${report.reportId}`;
    const sheet = workbook.addWorksheet('Clearance Summary', {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      },
    });
    sheet.columns = [
      { key: 'label', width: 28 },
      { key: 'value', width: 34 },
      { key: 'label2', width: 24 },
      { key: 'value2', width: 28 },
    ];
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = report.university.name;
    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = 'ATTENDANCE CLEARANCE REPORT';
    sheet.mergeCells('A3:D3');
    sheet.getCell('A3').value = `${report.faculty} | ${report.department}`;
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 24;
    for (const address of ['A1', 'A2', 'A3']) {
      sheet.getCell(address).alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getCell(address).font = {
        bold: address !== 'A3',
        size: address === 'A1' ? 16 : address === 'A2' ? 12 : 10,
        color: { argb: 'FFFFFFFF' },
      };
      sheet.getCell(address).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF14532D' },
      };
    }
    if (images.logo) {
      const logoId = workbook.addImage({
        buffer: images.logo.buffer as unknown as ArrayBuffer,
        extension: images.logo.mimeType === 'image/jpeg' ? 'jpeg' : 'png',
      });
      sheet.addImage(logoId, { tl: { col: 0.05, row: 0.05 }, ext: { width: 42, height: 42 } });
    }
    if (images.headshot) {
      const photoId = workbook.addImage({
        buffer: images.headshot.buffer as unknown as ArrayBuffer,
        extension: images.headshot.mimeType === 'image/jpeg' ? 'jpeg' : 'png',
      });
      sheet.addImage(photoId, { tl: { col: 3.1, row: 4.1 }, ext: { width: 62, height: 72 } });
    }
    sheet.addRow(['Field', 'Value', 'Field', 'Value']);
    sheet.getRow(4).height = 22;
    sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF14532D' },
    };
    const rows: ReadonlyArray<readonly [string, string | number, string, string | number]> = [
      ['Report ID', report.reportId, 'Version', report.version],
      ['Student Name', report.student.name, 'Matric Number', report.student.matricNumber],
      ['Programme', report.student.programme, 'Level', report.student.level],
      ['Academic Session', report.academicSession, 'Semester', report.semester],
      ['Course Code', report.course.code, 'Course Title', report.course.title],
      ['Registration Number', report.registrationNumber, 'Registration', 'Confirmed'],
      ['Sessions Held', report.statistics.sessionsHeld, 'Present', report.statistics.present],
      ['Late', report.statistics.late, 'Absent', report.statistics.absent],
      ['Excused', report.statistics.excused, 'Current Streak', report.statistics.currentStreak],
      [
        'Attendance',
        report.statistics.attendancePercentage / 100,
        'Required',
        report.statistics.requiredPercentage / 100,
      ],
      [
        'Attendance Score',
        report.statistics.attendanceScore / 100,
        'Decision',
        decisionLabel(report),
      ],
      [
        'Issue Date',
        new Date(report.issuedAt).toLocaleString('en-NG'),
        'Status',
        report.status.toUpperCase(),
      ],
      [
        'Verification URL',
        'See Verification Data sheet',
        'Checksum',
        `${report.checksum.slice(0, 16)}...`,
      ],
      ['Digital Signature', 'See Verification Data sheet', 'Generated By', report.generatedBy],
    ];
    rows.forEach((values) => sheet.addRow([...values]));
    for (let row = 5; row <= 18; row += 1) {
      sheet.getCell(row, 1).font = { bold: true, color: { argb: 'FF14532D' } };
      sheet.getCell(row, 3).font = { bold: true, color: { argb: 'FF14532D' } };
      sheet.getRow(row).height = 24;
      sheet.getRow(row).alignment = { vertical: 'middle', wrapText: true };
      if (row % 2 === 0)
        sheet.getRow(row).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0FDF4' },
        };
    }
    for (const address of ['B14', 'D14', 'B15']) sheet.getCell(address).numFmt = '0.00%';
    sheet.getCell('D15').font = { bold: true, color: { argb: 'FF14532D' } };
    sheet.autoFilter = 'A4:D18';
    sheet.headerFooter.oddFooter = `&L${report.reportId}&CServer verification required&RPage &P of &N`;
    const data = workbook.addWorksheet('Verification Data', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      },
    });
    data.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 72 },
    ];
    [
      ['Report ID', report.reportId],
      ['Verification URL', report.verificationUrl],
      ['Checksum', report.checksum],
      ['Digital Signature', report.digitalSignature],
      ['Issued At', report.issuedAt],
      ['Calculated At', report.statistics.calculatedAt],
    ].forEach(([field, value]) => data.addRow({ field, value }));
    data.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    data.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
    data.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
    data.headerFooter.oddFooter = `&L${report.reportId}&CVerification metadata&RPage &P of &N`;
    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output);
  }

  csv(report: ClearanceReportDetail): Buffer {
    const rows: ReadonlyArray<readonly [string, string | number | boolean]> = [
      ['Report ID', report.reportId],
      ['Version', report.version],
      ['University', report.university.name],
      ['Faculty', report.faculty],
      ['Department', report.department],
      ['Student Name', report.student.name],
      ['Matric Number', report.student.matricNumber],
      ['Programme', report.student.programme],
      ['Level', report.student.level],
      ['Academic Session', report.academicSession],
      ['Semester', report.semester],
      ['Course Code', report.course.code],
      ['Course Title', report.course.title],
      ['Course Registration Confirmed', report.courseRegistrationConfirmed],
      ['Registration Number', report.registrationNumber],
      ['Sessions Held', report.statistics.sessionsHeld],
      ['Present', report.statistics.present],
      ['Late', report.statistics.late],
      ['Absent', report.statistics.absent],
      ['Excused', report.statistics.excused],
      ['Attendance Percentage', report.statistics.attendancePercentage],
      ['Required Percentage', report.statistics.requiredPercentage],
      ['Attendance Score', report.statistics.attendanceScore],
      ['Current Streak', report.statistics.currentStreak],
      ['Eligibility Decision', report.decision],
      ['Issue Date', report.issuedAt],
      ['Status', report.status],
      ['Verification URL', report.verificationUrl],
      ['Checksum', report.checksum],
      ['Digital Signature', report.digitalSignature],
    ];
    const content = [['Field', 'Value'], ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    return Buffer.from(`\uFEFF${content}\r\n`, 'utf8');
  }
}

export const clearanceExportService = new ClearanceExportService();
