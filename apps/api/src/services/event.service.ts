import { createHash } from 'node:crypto';
import type {
  EventAnalytics,
  EventAudience,
  EventPage,
  EventParticipantPage,
  EventParticipationSummary,
  EventSummary,
  RequestActor,
} from '@qr/types';
import { Types, type FilterQuery } from 'mongoose';
import { AttendanceRecordModel } from '../models/attendance-record.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { EventModel, type EventRecord } from '../models/event.model.js';
import { EventRegistrationModel } from '../models/event-registration.model.js';
import { EventVerificationAttemptModel } from '../models/event-verification-attempt.model.js';
import { EventReportSnapshotModel } from '../models/event-report-snapshot.model.js';
import { UserModel } from '../models/user.model.js';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { socketService } from '../socket/socket.service.js';
import type {
  CreateEventInput,
  EventHistoryInput,
  EventListInput,
  EventParticipantListInput,
  UpdateEventInput,
} from '../validators/event.validator.js';
import { attendanceService } from './attendance.service.js';
import { auditService } from './audit.service.js';
import { faceVerificationService } from './face-verification.service.js';
import { mediaUploadService } from './media-upload.service.js';
import { eventNotificationService } from './event-notification.service.js';

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function pinHash(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

function privacyHash(value: string | undefined): string | undefined {
  return value ? createHash('sha256').update(value).digest('hex') : undefined;
}

function verificationFailure(error: unknown): {
  readonly failureType:
    'gps' | 'face' | 'duplicate' | 'credential' | 'permission' | 'session' | 'other';
  readonly reasonCode: string;
} {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('already been recorded') || message.includes('duplicate'))
    return { failureType: 'duplicate', reasonCode: 'attendance_already_recorded' };
  if (message.includes('location') || message.includes('gps') || message.includes('geofence'))
    return { failureType: 'gps', reasonCode: 'location_verification_failed' };
  if (message.includes('face') || message.includes('biometric'))
    return { failureType: 'face', reasonCode: 'face_verification_failed' };
  if (message.includes('audience') || message.includes('register'))
    return { failureType: 'permission', reasonCode: 'participant_not_authorized' };
  if (message.includes('session') || message.includes('closed') || message.includes('open'))
    return { failureType: 'session', reasonCode: 'attendance_session_unavailable' };
  if (
    message.includes('code') ||
    message.includes('token') ||
    message.includes('pin') ||
    message.includes('qr')
  )
    return { failureType: 'credential', reasonCode: 'credential_verification_failed' };
  return { failureType: 'other', reasonCode: 'verification_failed' };
}

function date(value: Date | string): string {
  return new Date(value).toISOString();
}

function objectId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return value instanceof Types.ObjectId ? value.toHexString() : undefined;
}

interface EventViewSource {
  readonly _id: unknown;
  readonly title: string;
  readonly description: string;
  readonly eventType: EventSummary['eventType'];
  readonly customType?: string | null;
  readonly organizerId: unknown;
  readonly organizerName: string;
  readonly campus?: string | null;
  readonly venue: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timeZone: string;
  readonly academicSessionId?: unknown;
  readonly academicSessionName?: string | null;
  readonly termId?: unknown;
  readonly termName?: string | null;
  readonly capacity?: number | null;
  readonly registrationRequired: boolean;
  readonly mandatory: boolean;
  readonly audience: {
    readonly roles?: readonly EventAudience['roles'][number][];
    readonly campus?: string | null;
    readonly facultyName?: string | null;
    readonly departmentId?: unknown;
    readonly programme?: string | null;
    readonly level?: string | null;
  };
  readonly reminderOffsetsMinutes?: readonly number[];
  readonly notificationChannels?: EventSummary['notificationChannels'];
  readonly postEventMessage?: string | null;
  readonly participantReportAvailable?: boolean;
  readonly attendanceMethods?: EventSummary['attendanceMethods'];
  readonly qrRotationSeconds: number;
  readonly gps?: {
    readonly latitude?: number;
    readonly longitude?: number;
    readonly maximumRadiusMetres?: number;
  };
  readonly faceVerificationRequired: boolean;
  readonly manualAttendanceAllowed: boolean;
  readonly pinAttendanceAllowed: boolean;
  readonly bannerUrl?: string | null;
  readonly attachments?: EventSummary['attachments'];
  readonly status: EventSummary['status'];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

function eventView(
  rawSource: unknown,
  registration?: {
    readonly registrationStatus?: EventSummary['registrationStatus'];
    readonly participationStatus?: EventSummary['participationStatus'];
  },
  activeSession?: { readonly id: string; readonly closesAt: Date },
): EventSummary {
  const source = rawSource as EventViewSource;
  const gps =
    source.gps?.latitude != null && source.gps.longitude != null
      ? {
          latitude: source.gps.latitude,
          longitude: source.gps.longitude,
          maximumRadiusMetres: source.gps.maximumRadiusMetres ?? 100,
        }
      : undefined;
  const audienceDepartmentId = objectId(source.audience.departmentId);
  const academicSessionId = objectId(source.academicSessionId);
  const termId = objectId(source.termId);
  return {
    id: String(source._id),
    title: source.title,
    description: source.description,
    eventType: source.eventType,
    ...(source.customType ? { customType: source.customType } : {}),
    organizerId: String(source.organizerId),
    organizerName: source.organizerName,
    ...(source.campus ? { campus: source.campus } : {}),
    venue: source.venue,
    startsAt: date(source.startsAt),
    endsAt: date(source.endsAt),
    timeZone: source.timeZone,
    ...(academicSessionId && source.academicSessionName
      ? { academicSession: { id: academicSessionId, name: source.academicSessionName } }
      : {}),
    ...(termId && source.termName ? { term: { id: termId, name: source.termName } } : {}),
    ...(source.capacity ? { capacity: source.capacity } : {}),
    registrationRequired: source.registrationRequired,
    mandatory: source.mandatory,
    audience: {
      roles: source.audience.roles ?? [],
      ...(source.audience.campus ? { campus: source.audience.campus } : {}),
      ...(source.audience.facultyName ? { facultyName: source.audience.facultyName } : {}),
      ...(audienceDepartmentId ? { departmentId: audienceDepartmentId } : {}),
      ...(source.audience.programme ? { programme: source.audience.programme } : {}),
      ...(source.audience.level ? { level: source.audience.level } : {}),
    },
    reminderOffsetsMinutes: source.reminderOffsetsMinutes ?? [],
    notificationChannels: source.notificationChannels ?? ['in_app'],
    ...(source.postEventMessage ? { postEventMessage: source.postEventMessage } : {}),
    participantReportAvailable: source.participantReportAvailable ?? false,
    attendanceMethods: source.attendanceMethods ?? ['dynamic_qr'],
    qrRotationSeconds: source.qrRotationSeconds,
    ...(gps ? { gps } : {}),
    faceVerificationRequired: source.faceVerificationRequired,
    manualAttendanceAllowed: source.manualAttendanceAllowed,
    pinAttendanceAllowed: source.pinAttendanceAllowed,
    ...(source.bannerUrl ? { bannerUrl: source.bannerUrl } : {}),
    attachments: (source.attachments ?? []).map((attachment) => ({
      ...attachment,
      ...(attachment.assetId ? { assetId: String(attachment.assetId) } : {}),
    })),
    ...(activeSession
      ? {
          activeAttendanceSessionId: activeSession.id,
          attendanceClosesAt: activeSession.closesAt.toISOString(),
        }
      : {}),
    status: source.status,
    ...(registration?.registrationStatus
      ? { registrationStatus: registration.registrationStatus }
      : {}),
    ...(registration?.participationStatus
      ? { participationStatus: registration.participationStatus }
      : {}),
    createdAt: date(source.createdAt ?? new Date()),
    updatedAt: date(source.updatedAt ?? source.createdAt ?? new Date()),
  };
}

export class EventService {
  private async academicPeriods(
    actor: RequestActor,
    input: {
      readonly academicSessionId?: string | undefined;
      readonly termId?: string | undefined;
    },
  ) {
    const ids = [input.academicSessionId, input.termId].filter((value): value is string =>
      Boolean(value),
    );
    if (!ids.length) return {};
    const records = await InstitutionStructureModel.find({
      _id: { $in: ids },
      universityId: actor.universityId,
      status: 'active',
    })
      .select('kind name parentId')
      .lean()
      .exec();
    const session = input.academicSessionId
      ? records.find(
          (item) =>
            String(item._id) === input.academicSessionId && item.kind === 'academic_session',
        )
      : undefined;
    const term = input.termId
      ? records.find((item) => String(item._id) === input.termId && item.kind === 'term')
      : undefined;
    if (input.academicSessionId && !session)
      throw statusError('The selected academic session is unavailable.', 422);
    if (input.termId && !term)
      throw statusError('The selected semester or term is unavailable.', 422);
    if (session && term?.parentId && String(term.parentId) !== String(session._id))
      throw statusError('The selected term does not belong to the academic session.', 422);
    return {
      ...(session ? { academicSessionId: session._id, academicSessionName: session.name } : {}),
      ...(term ? { termId: term._id, termName: term.name } : {}),
    };
  }

  private assertBanner(
    bannerUrl: string | undefined,
    attachments: readonly { readonly url: string; readonly mimeType: string }[],
    legacyBanner?: string,
  ) {
    if (!bannerUrl || bannerUrl === legacyBanner) return;
    const banner = attachments.find((attachment) => attachment.url === bannerUrl);
    if (!banner || !banner.mimeType.startsWith('image/'))
      throw statusError('The event banner must use a verified uploaded image.', 422);
  }

  private async actorProfile(actor: RequestActor) {
    const profile = await UserModel.findOne({ _id: actor.id, universityId: actor.universityId })
      .select('firstName lastName campus facultyName departmentId role')
      .lean()
      .exec();
    if (!profile) throw statusError('The current user profile was not found.', 404);
    return profile;
  }

  private async scopedAudience(
    actor: RequestActor,
    requested: EventAudience,
  ): Promise<EventAudience> {
    if (['super_admin', 'university_admin'].includes(actor.role)) return requested;
    const profile = await this.actorProfile(actor);
    if (actor.role === 'faculty_admin')
      return { ...requested, ...(profile.facultyName ? { facultyName: profile.facultyName } : {}) };
    if (actor.role === 'department_admin' || actor.role === 'lecturer')
      return {
        ...requested,
        ...(profile.facultyName ? { facultyName: profile.facultyName } : {}),
        ...(profile.departmentId ? { departmentId: String(profile.departmentId) } : {}),
        roles: requested.roles.length ? requested.roles : ['student'],
      };
    throw statusError('You cannot create events for this institution.', 403);
  }

  private async canManage(actor: RequestActor, rawEvent: unknown): Promise<void> {
    const event = rawEvent as Pick<EventViewSource, 'organizerId' | 'audience'>;
    if (
      ['super_admin', 'university_admin'].includes(actor.role) ||
      String(event.organizerId) === actor.id
    )
      return;
    const profile = await this.actorProfile(actor);
    if (
      actor.role === 'faculty_admin' &&
      profile.facultyName &&
      event.audience.facultyName === profile.facultyName
    )
      return;
    if (
      actor.role === 'department_admin' &&
      profile.departmentId &&
      String(event.audience.departmentId) === String(profile.departmentId)
    )
      return;
    throw statusError('This event is outside your management scope.', 403);
  }

  private async event(actor: RequestActor, eventId: string, includePin = false) {
    const query = EventModel.findOne({ _id: eventId, universityId: actor.universityId });
    if (includePin) query.select('+attendancePinHash');
    const event = await query.exec();
    if (!event) throw statusError('Event was not found.', 404);
    return event;
  }

  private async recipients(universityId: string, audience: EventAudience) {
    return UserModel.find({
      universityId,
      accountStatus: 'active',
      ...(audience.roles.length ? { role: { $in: audience.roles } } : {}),
      ...(audience.campus ? { campus: audience.campus } : {}),
      ...(audience.facultyName ? { facultyName: audience.facultyName } : {}),
      ...(audience.departmentId ? { departmentId: audience.departmentId } : {}),
      ...(audience.programme ? { programme: audience.programme } : {}),
      ...(audience.level ? { level: audience.level } : {}),
    })
      .select('_id')
      .limit(50_000)
      .lean()
      .exec();
  }

  private async materializeAudience(event: Awaited<ReturnType<EventService['event']>>) {
    const users = await this.recipients(String(event.universityId), eventView(event).audience);
    if (!users.length) return 0;
    const universityId = new Types.ObjectId(String(event.universityId));
    await EventRegistrationModel.bulkWrite(
      users.map((user) => ({
        updateOne: {
          filter: { universityId, eventId: event._id, userId: user._id },
          update: {
            $setOnInsert: {
              universityId,
              eventId: event._id,
              userId: user._id,
              registrationStatus: 'invited',
              participationStatus: 'pending',
              mandatory: event.mandatory,
              createdBy: event.organizerId,
              updatedBy: event.organizerId,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    return users.length;
  }

  async create(actor: RequestActor, input: CreateEventInput) {
    if (input.faceVerificationRequired) faceVerificationService.assertConfigured();
    await mediaUploadService.assertOwnedAttachments(actor, 'event', input.attachments);
    this.assertBanner(input.bannerUrl, input.attachments);
    const profile = await this.actorProfile(actor);
    const audience = await this.scopedAudience(actor, input.audience);
    const periods = await this.academicPeriods(actor, input);
    const event = await EventModel.create({
      ...input,
      audience,
      ...periods,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      organizerId: actor.id,
      organizerName: `${profile.firstName} ${profile.lastName}`,
      attendancePinHash: input.attendancePin ? pinHash(input.attendancePin) : undefined,
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      actor,
      action: 'event.created',
      resourceType: 'event',
      resourceId: event.id,
      newValue: event.toJSON(),
    });
    return eventView(event);
  }

  async update(actor: RequestActor, eventId: string, input: UpdateEventInput) {
    const event = await this.event(actor, eventId, true);
    await this.canManage(actor, event);
    if (!['draft', 'scheduled'].includes(event.status))
      throw statusError('Only draft or scheduled events can be edited.', 409);
    const oldValue = event.toJSON();
    const previousView = eventView(event);
    const attachments = input.attachments ?? previousView.attachments;
    const bannerUrl = input.bannerUrl ?? previousView.bannerUrl;
    await mediaUploadService.assertOwnedAttachments(
      actor,
      'event',
      attachments,
      previousView.attachments,
    );
    this.assertBanner(bannerUrl, attachments, previousView.bannerUrl);
    const audience = input.audience ? await this.scopedAudience(actor, input.audience) : undefined;
    const periods = await this.academicPeriods(actor, input);
    event.set({
      ...input,
      ...(audience ? { audience } : {}),
      ...periods,
      ...(input.startsAt ? { startsAt: new Date(input.startsAt) } : {}),
      ...(input.endsAt ? { endsAt: new Date(input.endsAt) } : {}),
      ...(input.attendancePin ? { attendancePinHash: pinHash(input.attendancePin) } : {}),
      updatedBy: actor.id,
    });
    await event.save();
    await auditService.record({
      actor,
      action: 'event.updated',
      resourceType: 'event',
      resourceId: event.id,
      oldValue,
      newValue: event.toJSON(),
    });
    if (event.status === 'scheduled') {
      socketService.emitToUniversity(actor.universityId, 'event:updated', { eventId: event.id });
      const registrations = await EventRegistrationModel.find({
        universityId: actor.universityId,
        eventId: event.id,
        registrationStatus: { $ne: 'cancelled' },
      })
        .select('userId')
        .lean()
        .exec();
      await eventNotificationService.deliver({
        universityId: actor.universityId,
        eventId: event.id,
        recipientIds: registrations.map((registration) => String(registration.userId)),
        eventChannels: event.notificationChannels,
        classification: 'operational',
        kind: 'event_updated',
        title: `${event.title} was updated`,
        body: `Review the latest schedule and venue details for ${event.title}.`,
        priority: 'high',
        occurrenceKey: `updated-${Date.now()}`,
      });
    }
    return eventView(event);
  }

  async list(actor: RequestActor, input: EventListInput, management = false): Promise<EventPage> {
    const filter: FilterQuery<EventRecord> = {
      universityId: actor.universityId,
      ...(input.search ? { $text: { $search: input.search } } : {}),
      ...(input.status === 'all' ? {} : { status: input.status }),
      ...(input.eventType === 'all' ? {} : { eventType: input.eventType }),
      ...(input.mandatory === 'all' ? {} : { mandatory: input.mandatory === 'true' }),
      ...(input.from || input.to
        ? {
            startsAt: {
              ...(input.from ? { $gte: new Date(input.from) } : {}),
              ...(input.to ? { $lte: new Date(input.to) } : {}),
            },
          }
        : {}),
    };
    let registrations = new Map<
      string,
      {
        registrationStatus: EventSummary['registrationStatus'];
        participationStatus: EventSummary['participationStatus'];
      }
    >();
    if (management) {
      if (!actor.permissions.includes('events:write'))
        throw statusError('Event management permission is required.', 403);
      if (!['super_admin', 'university_admin'].includes(actor.role)) filter.organizerId = actor.id;
    } else {
      const rows = await EventRegistrationModel.find({
        universityId: actor.universityId,
        userId: actor.id,
        registrationStatus: { $ne: 'cancelled' },
      })
        .select('eventId registrationStatus participationStatus')
        .lean()
        .exec();
      registrations = new Map(
        rows.map((row) => [
          String(row.eventId),
          {
            registrationStatus: row.registrationStatus,
            participationStatus: row.participationStatus,
          },
        ]),
      );
      filter._id = { $in: [...registrations.keys()] };
      filter.status =
        input.status === 'all' ? { $in: ['scheduled', 'active', 'completed'] } : input.status;
    }
    const [items, total] = await Promise.all([
      EventModel.find(filter)
        .sort({ startsAt: 1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      EventModel.countDocuments(filter),
    ]);
    const activeSessions = management
      ? await AttendanceSessionModel.find({
          universityId: actor.universityId,
          eventId: { $in: items.map((item) => item._id) },
          contextType: 'EVENT_SESSION',
          status: 'open',
        })
          .select('eventId closesAt')
          .lean()
          .exec()
      : [];
    const activeSessionMap = new Map(
      activeSessions.map((session) => [
        String(session.eventId),
        { id: String(session._id), closesAt: session.closesAt },
      ]),
    );
    return {
      items: items.map((item) => {
        const id = String(item._id);
        return eventView(item, registrations.get(id), activeSessionMap.get(id));
      }),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  async detail(actor: RequestActor, eventId: string) {
    const event = await this.event(actor, eventId);
    const registration = await EventRegistrationModel.findOne({
      universityId: actor.universityId,
      eventId,
      userId: actor.id,
    })
      .lean()
      .exec();
    if (!registration && !actor.permissions.includes('events:write'))
      throw statusError('This event is outside your audience.', 403);
    if (!registration) await this.canManage(actor, event);
    return eventView(
      event,
      registration
        ? {
            registrationStatus: registration.registrationStatus,
            participationStatus: registration.participationStatus,
          }
        : undefined,
    );
  }

  async publish(actor: RequestActor, eventId: string) {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    if (!['draft', 'scheduled'].includes(event.status))
      throw statusError('This event cannot be published from its current status.', 409);
    const now = new Date();
    event.set({
      status: event.startsAt <= now && event.endsAt > now ? 'active' : 'scheduled',
      publishedAt: event.publishedAt ?? now,
      updatedBy: actor.id,
    });
    await event.save();
    const targeted = await this.materializeAudience(event);
    const registrations = await EventRegistrationModel.find({
      universityId: actor.universityId,
      eventId: event.id,
    })
      .select('userId')
      .lean()
      .exec();
    await eventNotificationService.deliver({
      universityId: actor.universityId,
      eventId: event.id,
      recipientIds: registrations.map((registration) => String(registration.userId)),
      eventChannels: event.notificationChannels,
      classification: event.mandatory ? 'mandatory' : 'informational',
      kind: event.mandatory ? 'mandatory_event' : 'event_published',
      title: event.mandatory ? `Mandatory event: ${event.title}` : `New event: ${event.title}`,
      body: `${event.title} takes place at ${event.venue} on ${event.startsAt.toLocaleString('en-NG')}.`,
      priority: event.mandatory ? 'high' : 'normal',
      occurrenceKey: `published-${event.publishedAt?.getTime() ?? now.getTime()}`,
    });
    await auditService.record({
      actor,
      action: 'event.published',
      resourceType: 'event',
      resourceId: event.id,
      newValue: { status: event.status, targeted },
    });
    socketService.emitToUniversity(actor.universityId, 'event:published', {
      eventId: event.id,
      targeted,
    });
    return { ...eventView(event), targeted };
  }

  async register(actor: RequestActor, eventId: string) {
    const event = await this.event(actor, eventId);
    if (!['scheduled', 'active'].includes(event.status))
      throw statusError('Registration is not open for this event.', 409);
    const registration = await EventRegistrationModel.findOne({
      universityId: actor.universityId,
      eventId,
      userId: actor.id,
    }).exec();
    if (!registration) throw statusError('This event is outside your assigned audience.', 403);
    if (!event.registrationRequired)
      return eventView(event, {
        registrationStatus: registration.registrationStatus,
        participationStatus: registration.participationStatus,
      });
    if (event.capacity) {
      const registered = await EventRegistrationModel.countDocuments({
        universityId: actor.universityId,
        eventId,
        registrationStatus: 'registered',
      });
      if (registered >= event.capacity) throw statusError('This event has reached capacity.', 409);
    }
    registration.set({
      registrationStatus: 'registered',
      registeredAt: new Date(),
      updatedBy: actor.id,
    });
    await registration.save();
    await eventNotificationService.deliver({
      universityId: actor.universityId,
      eventId,
      recipientIds: [actor.id],
      eventChannels: event.notificationChannels,
      classification: 'operational',
      kind: 'event_registration',
      title: 'Event registration confirmed',
      body: `Your place for ${event.title} is confirmed.`,
      priority: 'normal',
      occurrenceKey: `registration-${actor.id}`,
    });
    return eventView(event, {
      registrationStatus: registration.registrationStatus,
      participationStatus: registration.participationStatus,
    });
  }

  async cancel(actor: RequestActor, eventId: string, reason: string) {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    if (['completed', 'cancelled', 'archived'].includes(event.status))
      throw statusError('This event can no longer be cancelled.', 409);
    event.set({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
      updatedBy: actor.id,
    });
    await event.save();
    await AttendanceSessionModel.updateMany(
      { universityId: actor.universityId, eventId, contextType: 'EVENT_SESSION', status: 'open' },
      { $set: { status: 'closed', closedAt: new Date(), updatedBy: actor.id } },
    ).exec();
    const registrations = await EventRegistrationModel.find({
      universityId: actor.universityId,
      eventId,
      registrationStatus: { $ne: 'cancelled' },
    })
      .select('userId')
      .lean()
      .exec();
    await eventNotificationService.deliver({
      universityId: actor.universityId,
      eventId,
      recipientIds: registrations.map((registration) => String(registration.userId)),
      eventChannels: event.notificationChannels,
      classification: 'mandatory',
      kind: 'event_cancelled',
      title: `${event.title} cancelled`,
      body: reason,
      priority: 'high',
      occurrenceKey: `cancelled-${event.cancelledAt?.getTime() ?? Date.now()}`,
    });
    await auditService.record({
      actor,
      action: 'event.cancelled',
      resourceType: 'event',
      resourceId: event.id,
      newValue: { reason },
    });
    socketService.emitToUniversity(actor.universityId, 'event:cancelled', { eventId, reason });
    return eventView(event);
  }

  async archive(actor: RequestActor, eventId: string) {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    if (!['completed', 'cancelled'].includes(event.status))
      throw statusError('Complete or cancel the event before archiving it.', 409);
    event.set({ status: 'archived', updatedBy: actor.id });
    await event.save();
    await auditService.record({
      actor,
      action: 'event.archived',
      resourceType: 'event',
      resourceId: event.id,
    });
    return eventView(event);
  }

  async openAttendance(actor: RequestActor, eventId: string, durationMinutes: number) {
    const event = await this.event(actor, eventId, true);
    await this.canManage(actor, event);
    return attendanceService.createEventSession(actor, event, durationMinutes);
  }

  async closeAttendance(actor: RequestActor, eventId: string, sessionId: string) {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    return attendanceService.closeEventSession(actor, eventId, sessionId);
  }

  async requirements(
    actor: RequestActor,
    eventId: string,
    input: Parameters<typeof attendanceService.eventRequirements>[2],
  ) {
    return attendanceService.eventRequirements(actor, eventId, input);
  }

  async checkIn(
    actor: RequestActor,
    eventId: string,
    input: Parameters<typeof attendanceService.eventCheckIn>[2],
    requestContext: { readonly ipAddress?: string; readonly userAgent?: string },
  ) {
    const method = input.pin ? 'pin' : input.code || input.token ? 'dynamic_qr' : 'unknown';
    const baseAttempt = {
      eventId,
      userId: actor.id,
      method,
      ipHash: privacyHash(requestContext.ipAddress),
      deviceHash: privacyHash(requestContext.userAgent),
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
      occurredAt: new Date(),
    } as const;
    try {
      const record = await attendanceService.eventCheckIn(actor, eventId, input, requestContext);
      await EventVerificationAttemptModel.create({
        ...baseAttempt,
        sessionId: record.sessionId,
        outcome: 'success',
      });
      return record;
    } catch (error) {
      const failure = verificationFailure(error);
      const recentFailures = await EventVerificationAttemptModel.countDocuments({
        universityId: actor.universityId,
        eventId,
        userId: actor.id,
        outcome: { $in: ['failure', 'duplicate', 'suspicious'] },
        occurredAt: { $gte: new Date(Date.now() - 10 * 60_000) },
      }).exec();
      const outcome =
        failure.failureType === 'duplicate'
          ? 'duplicate'
          : recentFailures >= 4
            ? 'suspicious'
            : 'failure';
      await EventVerificationAttemptModel.create({ ...baseAttempt, ...failure, outcome });
      const event = await EventModel.findOne({ _id: eventId, universityId: actor.universityId })
        .select('title notificationChannels')
        .lean()
        .exec();
      if (event)
        await Promise.allSettled([
          eventNotificationService.deliver({
            universityId: actor.universityId,
            eventId,
            recipientIds: [actor.id],
            eventChannels: event.notificationChannels,
            classification: 'security',
            kind: 'event_attendance_failed',
            title: 'Event attendance verification failed',
            body: `${event.title} could not be verified. Review the stated requirement and retry securely.`,
            priority: 'high',
            occurrenceKey: `failed-${actor.id}-${Math.floor(Date.now() / 60_000)}`,
          }),
        ]);
      throw error;
    }
  }

  async manualAttendance(
    actor: RequestActor,
    eventId: string,
    input: {
      readonly userId: string;
      readonly status: 'present' | 'late' | 'excused' | 'rejected';
      readonly reason: string;
    },
  ) {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    if (!event.manualAttendanceAllowed)
      throw statusError('Manual attendance is disabled for this event.', 403);
    return attendanceService.recordManualEventAttendance(actor, event, input);
  }

  async excuse(actor: RequestActor, eventId: string, userId: string, reason: string) {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    const registration = await EventRegistrationModel.findOneAndUpdate(
      { universityId: actor.universityId, eventId, userId },
      {
        $set: {
          participationStatus: 'excused',
          excusedAt: new Date(),
          excusedBy: actor.id,
          excuseReason: reason,
          updatedBy: actor.id,
        },
      },
      { new: true },
    ).exec();
    if (!registration) throw statusError('Event participant was not found.', 404);
    await auditService.record({
      actor,
      action: 'event.participant_excused',
      resourceType: 'event_registration',
      resourceId: registration.id,
      newValue: { eventId, userId, reason },
    });
    return { userId, status: 'excused' as const, reason };
  }

  async participants(
    actor: RequestActor,
    eventId: string,
    input: EventParticipantListInput,
  ): Promise<EventParticipantPage> {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    const matchingUsers = input.search
      ? await UserModel.find({
          universityId: actor.universityId,
          $or: [
            { firstName: { $regex: input.search, $options: 'i' } },
            { lastName: { $regex: input.search, $options: 'i' } },
            { email: { $regex: input.search, $options: 'i' } },
            { matricNumber: { $regex: input.search, $options: 'i' } },
          ],
        })
          .select('_id')
          .limit(50_000)
          .lean()
          .exec()
      : undefined;
    const filter = {
      universityId: actor.universityId,
      eventId,
      ...(matchingUsers ? { userId: { $in: matchingUsers.map((user) => user._id) } } : {}),
      ...(input.status === 'all' ? {} : { participationStatus: input.status }),
    };
    const [registrations, total] = await Promise.all([
      EventRegistrationModel.find(filter)
        .populate('userId', 'firstName lastName email role programme level')
        .sort({ participationStatus: 1, createdAt: 1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      EventRegistrationModel.countDocuments(filter),
    ]);
    const userIds = registrations.map((registration) => {
      const user = registration.userId as unknown as { readonly _id: unknown };
      return String(user._id);
    });
    const records = await AttendanceRecordModel.find({
      universityId: actor.universityId,
      eventId,
      studentId: { $in: userIds },
      contextType: 'EVENT_SESSION',
    })
      .select('studentId checkedInAt verificationMethods')
      .lean()
      .exec();
    const recordMap = new Map(records.map((record) => [String(record.studentId), record]));
    return {
      items: registrations.map((registration) => {
        const user = registration.userId as unknown as {
          readonly _id: unknown;
          readonly firstName: string;
          readonly lastName: string;
          readonly email: string;
          readonly role: EventParticipantPage['items'][number]['role'];
          readonly programme?: string;
          readonly level?: string;
        };
        const userId = String(user._id);
        const record = recordMap.get(userId);
        return {
          userId,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          ...(user.programme ? { programme: user.programme } : {}),
          ...(user.level ? { level: user.level } : {}),
          mandatory: registration.mandatory,
          registrationStatus: registration.registrationStatus,
          participationStatus: registration.participationStatus,
          ...(record?.checkedInAt ? { checkedInAt: record.checkedInAt.toISOString() } : {}),
          verificationMethods: record?.verificationMethods ?? [],
          ...(registration.excuseReason ? { excuseReason: registration.excuseReason } : {}),
        };
      }),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.max(1, Math.ceil(total / input.limit)),
      },
    };
  }

  async history(actor: RequestActor, input: EventHistoryInput): Promise<EventParticipationSummary> {
    const eventFilter: FilterQuery<EventRecord> = {
      universityId: actor.universityId,
      ...(input.academicSessionId ? { academicSessionId: input.academicSessionId } : {}),
      ...(input.termId ? { termId: input.termId } : {}),
      ...(input.eventType === 'all' ? {} : { eventType: input.eventType }),
      ...(input.mandatory === 'all' ? {} : { mandatory: input.mandatory === 'true' }),
    };
    const matchingEvents = await EventModel.find(eventFilter).select('_id').lean().exec();
    const eventIds = matchingEvents.map((event) => event._id);
    const registrationFilter = {
      universityId: actor.universityId,
      userId: actor.id,
      eventId: { $in: eventIds },
      ...(input.status === 'all' ? {} : { participationStatus: input.status }),
    };
    const [registrations, total, aggregates, periodOptions] = await Promise.all([
      EventRegistrationModel.find(registrationFilter)
        .populate('eventId')
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      EventRegistrationModel.countDocuments(registrationFilter),
      EventRegistrationModel.aggregate<{
        present: number;
        late: number;
        absent: number;
        excused: number;
        mandatoryAttended: number;
        mandatoryMissed: number;
        optionalAttended: number;
      }>([
        {
          $match: {
            universityId: new Types.ObjectId(actor.universityId),
            userId: new Types.ObjectId(actor.id),
            eventId: { $in: eventIds },
            ...(input.status === 'all' ? {} : { participationStatus: input.status }),
          },
        },
        {
          $group: {
            _id: null,
            present: { $sum: { $cond: [{ $eq: ['$participationStatus', 'present'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$participationStatus', 'late'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$participationStatus', 'absent'] }, 1, 0] } },
            excused: { $sum: { $cond: [{ $eq: ['$participationStatus', 'excused'] }, 1, 0] } },
            mandatoryAttended: {
              $sum: {
                $cond: [
                  { $and: ['$mandatory', { $in: ['$participationStatus', ['present', 'late']] }] },
                  1,
                  0,
                ],
              },
            },
            mandatoryMissed: {
              $sum: {
                $cond: [
                  { $and: ['$mandatory', { $eq: ['$participationStatus', 'absent'] }] },
                  1,
                  0,
                ],
              },
            },
            optionalAttended: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$mandatory', false] },
                      { $in: ['$participationStatus', ['present', 'late']] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0 } },
      ]).exec(),
      InstitutionStructureModel.find({
        universityId: actor.universityId,
        kind: { $in: ['academic_session', 'term'] },
        status: 'active',
      })
        .select('kind name')
        .sort({ startsAt: -1, name: 1 })
        .lean()
        .exec(),
    ]);
    const records = await AttendanceRecordModel.find({
      universityId: actor.universityId,
      studentId: actor.id,
      eventId: {
        $in: registrations.map((registration) => {
          const event = registration.eventId as unknown as EventViewSource;
          return event._id;
        }),
      },
      contextType: 'EVENT_SESSION',
    })
      .lean()
      .exec();
    const recordMap = new Map(records.map((record) => [String(record.eventId), record]));
    const items = registrations.flatMap((registration) => {
      const event = registration.eventId as unknown as EventViewSource | null;
      if (!event || !('_id' in event)) return [];
      const record = recordMap.get(String(event._id));
      const academicSessionId = objectId(event.academicSessionId);
      const termId = objectId(event.termId);
      return [
        {
          id: String(registration._id),
          eventId: String(event._id),
          eventTitle: event.title,
          eventType: event.eventType,
          organizerName: event.organizerName,
          venue: event.venue,
          startsAt: date(event.startsAt),
          ...(academicSessionId && event.academicSessionName
            ? { academicSession: { id: academicSessionId, name: event.academicSessionName } }
            : {}),
          ...(termId && event.termName ? { term: { id: termId, name: event.termName } } : {}),
          mandatory: registration.mandatory,
          status: registration.participationStatus,
          ...(record?.checkedInAt ? { checkedInAt: date(record.checkedInAt) } : {}),
          methods: record?.verificationMethods ?? [],
          gpsVerified: record?.gps?.verified ?? false,
          faceVerified: record?.faceVerification?.verified ?? false,
        },
      ];
    });
    const counts = aggregates[0] ?? {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      mandatoryAttended: 0,
      mandatoryMissed: 0,
      optionalAttended: 0,
    };
    return {
      total,
      ...counts,
      items,
      filterOptions: {
        academicSessions: periodOptions
          .filter((item) => item.kind === 'academic_session')
          .map((item) => ({ id: String(item._id), name: item.name })),
        terms: periodOptions
          .filter((item) => item.kind === 'term')
          .map((item) => ({ id: String(item._id), name: item.name })),
      },
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.max(1, Math.ceil(total / input.limit)),
      },
    };
  }

  async analytics(
    actor: RequestActor,
    eventId: string,
    input: { readonly from?: string | undefined; readonly to?: string | undefined } = {},
  ): Promise<EventAnalytics> {
    const event = await this.event(actor, eventId);
    await this.canManage(actor, event);
    const dateFilter =
      input.from || input.to
        ? {
            $gte: input.from ? new Date(input.from) : new Date(0),
            $lte: input.to ? new Date(input.to) : new Date('9999-12-31T23:59:59.999Z'),
          }
        : undefined;
    const [registrations, records, attempts] = await Promise.all([
      EventRegistrationModel.find({ universityId: actor.universityId, eventId })
        .select('userId registrationStatus participationStatus mandatory')
        .lean()
        .exec(),
      AttendanceRecordModel.find({
        universityId: actor.universityId,
        eventId,
        contextType: 'EVENT_SESSION',
        ...(dateFilter ? { checkedInAt: dateFilter } : {}),
      })
        .select('studentId checkedInAt verificationMethods')
        .sort({ checkedInAt: 1 })
        .lean()
        .exec(),
      EventVerificationAttemptModel.find({
        universityId: actor.universityId,
        eventId,
        ...(dateFilter ? { occurredAt: dateFilter } : {}),
      })
        .select('outcome failureType occurredAt')
        .lean()
        .exec(),
    ]);
    const userIds = registrations.map((item) => item.userId);
    const users = await UserModel.find({ universityId: actor.universityId, _id: { $in: userIds } })
      .select('role campus facultyName departmentId programme level')
      .lean()
      .exec();
    const departmentIds = users.flatMap((user) => (user.departmentId ? [user.departmentId] : []));
    const departments = await DepartmentModel.find({
      universityId: actor.universityId,
      _id: { $in: departmentIds },
    })
      .select('name')
      .lean()
      .exec();
    const departmentNames = new Map(departments.map((item) => [String(item._id), item.name]));
    const userById = new Map(users.map((item) => [String(item._id), item]));
    const count = (status: string) =>
      registrations.filter((item) => item.participationStatus === status).length;
    const attended = count('present') + count('late');
    const mandatory = registrations.filter((item) => item.mandatory);
    const methodCounts = new Map<string, number>();
    const timeline = new Map<string, number>();
    for (const record of records) {
      for (const method of record.verificationMethods ?? [])
        methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
      const period = record.checkedInAt.toISOString().slice(0, 16);
      timeline.set(period, (timeline.get(period) ?? 0) + 1);
    }
    const timelineItems = [...timeline]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([period, count]) => ({ period, count }));
    let runningAttendance = 0;
    const attendanceOverTime = timelineItems.map((item) => {
      runningAttendance += item.count;
      return {
        period: item.period,
        attended: runningAttendance,
        attendanceRate: registrations.length
          ? Math.round((runningAttendance / registrations.length) * 1000) / 10
          : 0,
      };
    });
    const peakArrivalPeriod = timelineItems.reduce<(typeof timelineItems)[number] | undefined>(
      (peak, item) => (!peak || item.count > peak.count ? item : peak),
      undefined,
    );
    const breakdown = (labels: (user: (typeof users)[number]) => readonly string[]) => {
      const groups = new Map<string, { invited: number; attended: number }>();
      for (const registration of registrations) {
        const user = userById.get(String(registration.userId));
        if (!user) continue;
        for (const groupLabel of labels(user)) {
          if (!groupLabel) continue;
          const current = groups.get(groupLabel) ?? { invited: 0, attended: 0 };
          current.invited += 1;
          if (['present', 'late'].includes(registration.participationStatus)) current.attended += 1;
          groups.set(groupLabel, current);
        }
      }
      return [...groups]
        .map(([groupLabel, values]) => ({
          label: groupLabel,
          ...values,
          attendanceRate: values.invited
            ? Math.round((values.attended / values.invited) * 1000) / 10
            : 0,
        }))
        .sort(
          (left, right) => right.invited - left.invited || left.label.localeCompare(right.label),
        );
    };
    const failureCount = (failureType: string) =>
      attempts.filter((item) => item.failureType === failureType).length;
    const failedAttempts = attempts.filter((item) => item.outcome !== 'success');
    const comparisonEvents = await EventModel.find({
      universityId: actor.universityId,
      eventType: event.eventType,
      status: { $in: ['scheduled', 'active', 'completed', 'archived'] },
      ...(dateFilter ? { startsAt: dateFilter } : {}),
    })
      .select('_id title startsAt')
      .sort({ startsAt: -1 })
      .limit(6)
      .lean()
      .exec();
    const comparisonEventIds = comparisonEvents.map((item) => item._id);
    const comparisonCounts = await EventRegistrationModel.aggregate<{
      _id: Types.ObjectId;
      invited: number;
      attended: number;
    }>([
      {
        $match: {
          universityId: new Types.ObjectId(actor.universityId),
          eventId: { $in: comparisonEventIds },
        },
      },
      {
        $group: {
          _id: '$eventId',
          invited: { $sum: 1 },
          attended: {
            $sum: { $cond: [{ $in: ['$participationStatus', ['present', 'late']] }, 1, 0] },
          },
        },
      },
    ]).exec();
    const comparisonByEvent = new Map(comparisonCounts.map((item) => [String(item._id), item]));
    const periodEventFilter: FilterQuery<EventRecord> = {
      universityId: actor.universityId,
      status: { $in: ['scheduled', 'active', 'completed', 'archived'] },
      ...(dateFilter ? { startsAt: dateFilter } : {}),
      ...(event.academicSessionId ? { academicSessionId: event.academicSessionId } : {}),
      ...(event.termId ? { termId: event.termId } : {}),
    };
    const periodEvents = await EventModel.find(periodEventFilter)
      .select('_id academicSessionName termName')
      .sort({ startsAt: -1 })
      .limit(500)
      .lean()
      .exec();
    const periodEventById = new Map(periodEvents.map((item) => [String(item._id), item]));
    const periodRegistrations = await EventRegistrationModel.find({
      universityId: actor.universityId,
      eventId: { $in: periodEvents.map((item) => item._id) },
    })
      .select('eventId participationStatus')
      .lean()
      .exec();
    const semesterGroups = new Map<
      string,
      { academicSession: string; term: string; invited: number; attended: number }
    >();
    for (const registration of periodRegistrations) {
      const periodEvent = periodEventById.get(String(registration.eventId));
      if (!periodEvent) continue;
      const academicSession = periodEvent.academicSessionName ?? 'Unassigned session';
      const term = periodEvent.termName ?? 'Unassigned term';
      const key = `${academicSession}\u0000${term}`;
      const current = semesterGroups.get(key) ?? { academicSession, term, invited: 0, attended: 0 };
      current.invited += 1;
      if (['present', 'late'].includes(registration.participationStatus)) current.attended += 1;
      semesterGroups.set(key, current);
    }
    return {
      eventId,
      invited: registrations.length,
      registered: registrations.filter((item) => item.registrationStatus === 'registered').length,
      attended,
      absent: count('absent'),
      late: count('late'),
      excused: count('excused'),
      rejected: count('rejected'),
      pending: count('pending'),
      attendanceRate: registrations.length
        ? Math.round((attended / registrations.length) * 1000) / 10
        : 0,
      mandatoryCompliance: mandatory.length
        ? Math.round(
            (mandatory.filter((item) =>
              ['present', 'late', 'excused'].includes(item.participationStatus),
            ).length /
              mandatory.length) *
              1000,
          ) / 10
        : 100,
      verificationMethods: [...methodCounts].map(([method, count]) => ({
        method: method as EventAnalytics['verificationMethods'][number]['method'],
        count,
      })),
      checkInTimeline: timelineItems,
      attendanceOverTime,
      ...(peakArrivalPeriod ? { peakArrivalPeriod } : {}),
      attendanceByInstitutionUnit: breakdown((user) => [
        user.campus ? `Campus · ${user.campus}` : '',
        user.facultyName ? `Faculty · ${user.facultyName}` : '',
        user.departmentId
          ? `Department · ${departmentNames.get(String(user.departmentId)) ?? 'Unassigned'}`
          : '',
      ]),
      attendanceByProgramme: breakdown((user) => [user.programme ?? 'Unassigned programme']),
      attendanceByLevel: breakdown((user) => [user.level ?? 'Unassigned level']),
      attendanceByRole: breakdown((user) => [String(user.role).replaceAll('_', ' ')]),
      verificationFailures: {
        gps: failureCount('gps'),
        face: failureCount('face'),
        credential: failureCount('credential'),
        duplicate: failureCount('duplicate'),
        suspicious: attempts.filter((item) => item.outcome === 'suspicious').length,
        total: failedAttempts.length,
      },
      eventComparison: comparisonEvents.map((item) => {
        const values = comparisonByEvent.get(String(item._id)) ?? { invited: 0, attended: 0 };
        return {
          eventId: String(item._id),
          title: item.title,
          startsAt: item.startsAt.toISOString(),
          attendanceRate: values.invited
            ? Math.round((values.attended / values.invited) * 1000) / 10
            : 0,
        };
      }),
      semesterParticipation: [...semesterGroups.values()].map((item) => ({
        ...item,
        attendanceRate: item.invited ? Math.round((item.attended / item.invited) * 1000) / 10 : 0,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async analyticsExportData(
    actor: RequestActor,
    eventId: string,
    input: { readonly from?: string | undefined; readonly to?: string | undefined } = {},
  ) {
    const [event, analytics] = await Promise.all([
      this.detail(actor, eventId),
      this.analytics(actor, eventId, input),
    ]);
    return { event, analytics };
  }

  async processLifecycle(
    now = new Date(),
  ): Promise<{ activated: number; completed: number; reminded: number }> {
    const activated = await EventModel.updateMany(
      { status: 'scheduled', startsAt: { $lte: now }, endsAt: { $gt: now } },
      { $set: { status: 'active', updatedAt: now } },
    ).exec();
    const completing = await EventModel.find({ status: 'active', endsAt: { $lte: now } })
      .select(
        '_id universityId title mandatory notificationChannels postEventMessage participantReportAvailable',
      )
      .lean()
      .exec();
    let completed = 0;
    for (const event of completing) {
      const changed = await EventModel.updateOne(
        { _id: event._id, status: 'active' },
        { $set: { status: 'completed', updatedAt: now } },
      ).exec();
      if (!changed.modifiedCount) continue;
      completed += 1;
      await AttendanceSessionModel.updateMany(
        { universityId: event.universityId, eventId: event._id, status: 'open' },
        { $set: { status: 'closed', closedAt: now } },
      ).exec();
      const participantRows = await EventRegistrationModel.find({
        universityId: event.universityId,
        eventId: event._id,
        registrationStatus: { $ne: 'cancelled' },
      })
        .select('userId')
        .lean()
        .exec();
      const participantIds = participantRows.map((item) => String(item.userId));
      await eventNotificationService.deliver({
        universityId: String(event.universityId),
        eventId: String(event._id),
        recipientIds: participantIds,
        eventChannels: event.notificationChannels,
        classification: 'operational',
        kind: 'event_attendance_closed',
        title: `Attendance closed: ${event.title}`,
        body: 'Event attendance is closed. Your verified participation record is now available.',
        priority: 'normal',
        occurrenceKey: 'attendance-closed',
      });
      if (event.mandatory) {
        await EventRegistrationModel.updateMany(
          { universityId: event.universityId, eventId: event._id, participationStatus: 'pending' },
          { $set: { participationStatus: 'absent', updatedAt: now } },
        ).exec();
        const missed = await EventRegistrationModel.find({
          universityId: event.universityId,
          eventId: event._id,
          participationStatus: 'absent',
        })
          .select('userId')
          .lean()
          .exec();
        await eventNotificationService.deliver({
          universityId: String(event.universityId),
          eventId: String(event._id),
          recipientIds: missed.map((item) => String(item.userId)),
          eventChannels: event.notificationChannels,
          classification: 'mandatory',
          kind: 'mandatory_event_missed',
          title: `Mandatory event missed: ${event.title}`,
          body: 'Your record shows no verified attendance. Contact the event organizer if an excused absence applies.',
          priority: 'high',
          occurrenceKey: 'mandatory-missed',
        });
      }
      const snapshotRows = await EventRegistrationModel.aggregate<{
        invited: number;
        registered: number;
        present: number;
        late: number;
        absent: number;
        excused: number;
        rejected: number;
      }>([
        {
          $match: {
            universityId: event.universityId,
            eventId: event._id,
            registrationStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            invited: { $sum: 1 },
            registered: { $sum: { $cond: [{ $eq: ['$registrationStatus', 'registered'] }, 1, 0] } },
            present: { $sum: { $cond: [{ $eq: ['$participationStatus', 'present'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$participationStatus', 'late'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$participationStatus', 'absent'] }, 1, 0] } },
            excused: { $sum: { $cond: [{ $eq: ['$participationStatus', 'excused'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$participationStatus', 'rejected'] }, 1, 0] } },
          },
        },
      ]).exec();
      const snapshot = snapshotRows[0] ?? {
        invited: 0,
        registered: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        rejected: 0,
      };
      await EventReportSnapshotModel.findOneAndUpdate(
        { universityId: event.universityId, eventId: event._id },
        {
          $set: {
            ...snapshot,
            attendanceRate: snapshot.invited
              ? Math.round(((snapshot.present + snapshot.late) / snapshot.invited) * 1000) / 10
              : 0,
            generatedAt: now,
          },
          $setOnInsert: { universityId: event.universityId, eventId: event._id },
        },
        { upsert: true, new: true, runValidators: true },
      ).exec();
      if (event.postEventMessage)
        await eventNotificationService.deliver({
          universityId: String(event.universityId),
          eventId: String(event._id),
          recipientIds: participantIds,
          eventChannels: event.notificationChannels,
          classification: 'informational',
          kind: 'event_post_event',
          title: `After ${event.title}`,
          body: event.postEventMessage,
          priority: 'normal',
          occurrenceKey: 'post-event',
        });
      if (event.participantReportAvailable)
        await eventNotificationService.deliver({
          universityId: String(event.universityId),
          eventId: String(event._id),
          recipientIds: participantIds,
          eventChannels: event.notificationChannels,
          classification: 'informational',
          kind: 'event_report_available',
          title: `${event.title} participation report available`,
          body: 'Your event participation record is ready to view, print, or export in Attendity.',
          priority: 'normal',
          occurrenceKey: 'report-available',
        });
      socketService.emitToUniversity(String(event.universityId), 'event:attendance-closed', {
        eventId: String(event._id),
      });
      socketService.emitToUniversity(String(event.universityId), 'event:report-updated', {
        eventId: String(event._id),
      });
    }
    const candidates = await EventModel.find({
      status: 'scheduled',
      startsAt: { $gt: now },
      reminderOffsetsMinutes: { $exists: true, $ne: [] },
    })
      .select('+remindersProcessed')
      .exec();
    let reminded = 0;
    for (const event of candidates) {
      const due = event.reminderOffsetsMinutes.filter(
        (offset) =>
          !event.remindersProcessed.includes(offset) &&
          event.startsAt.getTime() - now.getTime() <= offset * 60_000,
      );
      for (const offset of due) {
        const claim = await EventModel.updateOne(
          { _id: event._id, remindersProcessed: { $ne: offset } },
          { $addToSet: { remindersProcessed: offset } },
        ).exec();
        if (!claim.modifiedCount) continue;
        const registrations = await EventRegistrationModel.find({
          universityId: event.universityId,
          eventId: event._id,
          registrationStatus: { $ne: 'cancelled' },
        })
          .select('userId')
          .lean()
          .exec();
        await eventNotificationService.deliver({
          universityId: String(event.universityId),
          eventId: String(event._id),
          recipientIds: registrations.map((item) => String(item.userId)),
          eventChannels: event.notificationChannels,
          classification: event.mandatory ? 'mandatory' : 'informational',
          kind: event.mandatory ? 'mandatory_event_reminder' : 'event_reminder',
          title: `Upcoming event: ${event.title}`,
          body: `${event.title} begins at ${event.startsAt.toLocaleString('en-NG')} in ${event.venue}.`,
          priority: event.mandatory ? 'high' : 'normal',
          occurrenceKey: `reminder-${offset}`,
        });
        reminded += registrations.length;
      }
    }
    return { activated: activated.modifiedCount, completed, reminded };
  }
}

export const eventService = new EventService();
