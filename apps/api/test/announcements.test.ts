import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ROLE_PERMISSIONS } from '@qr/shared';
import { AnnouncementModel } from '../src/models/announcement.model.js';
import { AnnouncementReceiptModel } from '../src/models/announcement-receipt.model.js';
import {
  createAnnouncementSchema,
  scheduleAnnouncementSchema,
} from '../src/validators/announcement.validator.js';

const objectId = '6650f27f52cf1956c94d0111';
const announcement = {
  title: 'Examination briefing',
  message: 'All final-year students should attend the examination briefing in the main hall.',
  category: 'academic',
  priority: 'high',
  audience: { roles: ['student'], level: '400' },
  attachments: [
    {
      name: 'Briefing guide.pdf',
      url: 'https://files.example.edu/briefing-guide.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 250_000,
    },
  ],
  pinned: true,
  acknowledgementRequired: true,
  channels: ['in_app'],
};

void describe('announcement contracts', () => {
  void it('accepts a targeted accessible announcement and secure attachment link', () => {
    assert.equal(createAnnouncementSchema.safeParse({ body: announcement }).success, true);
  });

  void it('rejects HTML content, insecure attachments, and empty delivery channels', () => {
    assert.equal(
      createAnnouncementSchema.safeParse({
        body: { ...announcement, message: '<script>alert(1)</script>' },
      }).success,
      false,
    );
    assert.equal(
      createAnnouncementSchema.safeParse({
        body: {
          ...announcement,
          attachments: [{ ...announcement.attachments[0], url: 'http://files.example.edu/a.pdf' }],
        },
      }).success,
      false,
    );
    assert.equal(
      createAnnouncementSchema.safeParse({ body: { ...announcement, channels: [] } }).success,
      false,
    );
  });

  void it('validates a scheduled publication timestamp and identifier', () => {
    assert.equal(
      scheduleAnnouncementSchema.safeParse({
        params: { announcementId: objectId },
        body: { publishAt: '2026-08-05T09:00:00.000Z' },
      }).success,
      true,
    );
    assert.equal(
      scheduleAnnouncementSchema.safeParse({
        params: { announcementId: 'unsafe' },
        body: { publishAt: 'tomorrow' },
      }).success,
      false,
    );
  });

  void it('grants publishing only to authorized management roles and lecturers', () => {
    for (const role of [
      'super_admin',
      'university_admin',
      'faculty_admin',
      'department_admin',
      'lecturer',
    ] as const)
      assert.ok(ROLE_PERMISSIONS[role].includes('announcements:write'));
    for (const role of ['student', 'examiner', 'viewer'] as const) {
      assert.ok(ROLE_PERMISSIONS[role].includes('announcements:read'));
      assert.equal(ROLE_PERMISSIONS[role].includes('announcements:write'), false);
    }
  });

  void it('defines tenant-scoped scheduling, feed, and idempotent receipt indexes', () => {
    assert.ok(
      AnnouncementModel.schema
        .indexes()
        .some(
          ([fields]) => fields.universityId === 1 && fields.status === 1 && fields.publishAt === 1,
        ),
    );
    assert.ok(
      AnnouncementReceiptModel.schema
        .indexes()
        .some(
          ([fields, options]) =>
            fields.universityId === 1 &&
            fields.announcementId === 1 &&
            fields.recipientId === 1 &&
            options.unique === true,
        ),
    );
  });
});
