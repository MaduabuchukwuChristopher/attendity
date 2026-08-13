import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ClassScheduleModel } from '../src/models/class-schedule.model.js';
import { ReminderPreferenceModel } from '../src/models/reminder-preference.model.js';
import { ScheduledNotificationModel } from '../src/models/scheduled-notification.model.js';
import {
  pushSubscriptionSchema,
  updateReminderPreferenceSchema,
} from '../src/validators/reminder.validator.js';
import {
  createScheduleSchema,
  updateScheduleSchema,
} from '../src/validators/schedule.validator.js';

const objectId = '6650f27f52cf1956c94d0111';
const preference = {
  enabled: true,
  defaultOffsetMinutes: 30,
  channels: ['in_app'],
  preferredTimeZone: 'Africa/Lagos',
  quietHours: { enabled: true, startMinute: 1320, endMinute: 420 },
  mutedCourseIds: [],
  overrides: [],
};

void describe('class reminder contracts', () => {
  void it('accepts complete reminder preferences and safe custom offsets', () => {
    assert.equal(updateReminderPreferenceSchema.safeParse({ body: preference }).success, true);
    assert.equal(
      updateReminderPreferenceSchema.safeParse({
        body: { ...preference, defaultOffsetMinutes: 10_081 },
      }).success,
      false,
    );
  });

  void it('requires channels when reminders are enabled and valid quiet hours', () => {
    assert.equal(
      updateReminderPreferenceSchema.safeParse({ body: { ...preference, channels: [] } }).success,
      false,
    );
    assert.equal(
      updateReminderPreferenceSchema.safeParse({
        body: { ...preference, quietHours: { enabled: true, startMinute: 60, endMinute: 60 } },
      }).success,
      false,
    );
  });

  void it('validates future schedule shapes and prevents course reassignment on updates', () => {
    const body = {
      courseId: objectId,
      startsAt: '2026-08-05T09:00:00.000Z',
      endsAt: '2026-08-05T10:30:00.000Z',
      venue: 'Academic Block A101',
      timeZone: 'Africa/Lagos',
    };
    assert.equal(createScheduleSchema.safeParse({ body }).success, true);
    assert.equal(
      updateScheduleSchema.safeParse({
        params: { scheduleId: objectId },
        body: { courseId: objectId },
      }).success,
      false,
    );
  });

  void it('requires HTTPS push subscription endpoints', () => {
    const body = {
      endpoint: 'http://push.example.test/subscription',
      keys: { p256dh: 'a'.repeat(32), auth: 'b'.repeat(16) },
    };
    assert.equal(pushSubscriptionSchema.safeParse({ body }).success, false);
    assert.equal(
      pushSubscriptionSchema.safeParse({
        body: { ...body, endpoint: 'https://push.example.test/subscription' },
      }).success,
      true,
    );
  });

  void it('defines tenant idempotency, delivery, and timetable indexes', () => {
    const deliveryIndexes = ScheduledNotificationModel.schema.indexes();
    assert.ok(
      deliveryIndexes.some(
        ([fields, options]) =>
          fields.universityId === 1 && fields.idempotencyKey === 1 && options.unique === true,
      ),
    );
    assert.ok(
      ClassScheduleModel.schema
        .indexes()
        .some(([fields]) => fields.universityId === 1 && fields.startsAt === 1),
    );
    assert.ok(
      ReminderPreferenceModel.schema
        .indexes()
        .some(
          ([fields, options]) =>
            fields.universityId === 1 && fields.userId === 1 && options.unique === true,
        ),
    );
    assert.deepEqual(ScheduledNotificationModel.schema.path('status').options.enum, [
      'pending',
      'processing',
      'delivered',
      'failed',
      'cancelled',
      'skipped',
    ]);
  });
});
