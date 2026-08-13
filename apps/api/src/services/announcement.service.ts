import type { AnnouncementAudience, AnnouncementSummary, RequestActor } from '@qr/types';
import { CourseModel } from '../models/course.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { UserModel } from '../models/user.model.js';
import {
  announcementRepository,
  announcementView,
} from '../repositories/announcement.repository.js';
import { socketService } from '../socket/socket.service.js';
import type {
  AnnouncementListInput,
  AnnouncementManagementInput,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '../validators/announcement.validator.js';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';
import { notificationService } from './notification.service.js';
import { pushDeliveryService } from './push-delivery.service.js';
import { mediaUploadService } from './media-upload.service.js';

interface PublisherScope {
  readonly id: string;
  readonly role: RequestActor['role'];
  readonly fullName: string;
  readonly campus?: string;
  readonly facultyName?: string;
  readonly departmentId?: string;
}

type AnnouncementDocument = NonNullable<
  Awaited<ReturnType<typeof announcementRepository.findById>>
>;

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function failureCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string')
    return error.code.slice(0, 100);
  return 'delivery_failed';
}

export class AnnouncementService {
  private async publisher(actor: RequestActor): Promise<PublisherScope> {
    const user = await UserModel.findOne({ _id: actor.id, universityId: actor.universityId })
      .select('firstName lastName role campus facultyName departmentId accountStatus')
      .lean()
      .exec();
    if (!user || user.accountStatus !== 'active')
      throw statusError('Your publisher account is unavailable.', 403);
    return {
      id: String(user._id),
      role: user.role,
      fullName: `${user.firstName} ${user.lastName}`,
      ...(user.campus ? { campus: user.campus } : {}),
      ...(user.facultyName ? { facultyName: user.facultyName } : {}),
      ...(user.departmentId ? { departmentId: String(user.departmentId) } : {}),
    };
  }

  private async assertAudienceReferences(actor: RequestActor, audience: AnnouncementAudience) {
    const [department, course] = await Promise.all([
      audience.departmentId
        ? DepartmentModel.exists({ _id: audience.departmentId, universityId: actor.universityId })
        : Promise.resolve(true),
      audience.courseId
        ? CourseModel.findOne({ _id: audience.courseId, universityId: actor.universityId })
            .select('lecturerId departmentId')
            .lean()
            .exec()
        : Promise.resolve(null),
    ]);
    if (!department) throw statusError('The selected department is unavailable.', 422);
    if (audience.courseId && !course) throw statusError('The selected course is unavailable.', 422);
    return course;
  }

  private async assertPublisherScope(
    actor: RequestActor,
    publisher: PublisherScope,
    audience: AnnouncementAudience,
  ) {
    const course = await this.assertAudienceReferences(actor, audience);
    if (publisher.role === 'super_admin' || publisher.role === 'university_admin') return;
    if (publisher.role === 'faculty_admin') {
      if (!publisher.facultyName || audience.facultyName !== publisher.facultyName)
        throw statusError('Faculty publishers must target only their assigned faculty.', 403);
      return;
    }
    if (publisher.role === 'department_admin') {
      if (!publisher.departmentId || audience.departmentId !== publisher.departmentId)
        throw statusError('Department publishers must target only their assigned department.', 403);
      return;
    }
    if (publisher.role === 'lecturer') {
      if (!audience.courseId || !course || String(course.lecturerId) !== actor.id)
        throw statusError('Lecturers may publish only to an assigned course.', 403);
      const invalidRole = audience.roles.some((role) => !['student', 'lecturer'].includes(role));
      if (invalidRole)
        throw statusError(
          'Lecturer course announcements can target students and lecturers only.',
          403,
        );
      return;
    }
    throw statusError('You cannot publish announcements.', 403);
  }

  private assertChannels(channels: readonly string[]) {
    if (channels.includes('sms'))
      throw statusError(
        'SMS announcements are unavailable until an approved provider is configured.',
        409,
      );
  }

  async create(actor: RequestActor, input: CreateAnnouncementInput): Promise<AnnouncementSummary> {
    this.assertChannels(input.channels);
    await mediaUploadService.assertOwnedAttachments(actor, 'announcement', input.attachments);
    const publisher = await this.publisher(actor);
    await this.assertPublisherScope(actor, publisher, input.audience);
    const record = await announcementRepository.create(
      actor.universityId,
      actor.id,
      publisher.fullName,
      input,
    );
    await auditService.record({
      action: 'announcement.created',
      resourceType: 'announcement',
      resourceId: String(record._id),
      actor,
      newValue: { title: input.title, audience: input.audience, status: 'draft' },
    });
    return announcementView(record.toObject());
  }

  async update(
    actor: RequestActor,
    announcementId: string,
    input: UpdateAnnouncementInput,
  ): Promise<AnnouncementSummary> {
    const record = await this.manageable(actor, announcementId);
    if (!['draft', 'scheduled'].includes(record.status))
      throw statusError('Only draft or scheduled announcements can be edited.', 409);
    const publisher = await this.publisher(actor);
    const audience = input.audience ?? announcementView(record.toObject()).audience;
    await this.assertPublisherScope(actor, publisher, audience);
    if (input.channels) this.assertChannels(input.channels);
    if (input.attachments)
      await mediaUploadService.assertOwnedAttachments(
        actor,
        'announcement',
        input.attachments,
        announcementView(record.toObject()).attachments,
      );
    const oldValue = { title: record.title, status: record.status, audience: record.audience };
    const updated = await announcementRepository.update(
      actor.universityId,
      announcementId,
      actor.id,
      input,
    );
    if (!updated) throw statusError('Announcement was not found.', 404);
    await auditService.record({
      action: 'announcement.updated',
      resourceType: 'announcement',
      resourceId: announcementId,
      actor,
      oldValue,
      newValue: input,
    });
    return announcementView(updated.toObject());
  }

  listFeed(actor: RequestActor, input: AnnouncementListInput) {
    return announcementRepository.listFeed(actor.universityId, actor.id, input);
  }

  async listManagement(actor: RequestActor, input: AnnouncementManagementInput) {
    const publisher = await this.publisher(actor);
    const filter: Record<string, unknown> = {};
    if (publisher.role === 'lecturer') filter.publisherId = actor.id;
    if (publisher.role === 'faculty_admin') {
      if (!publisher.facultyName) throw statusError('No faculty scope is assigned.', 403);
      filter['audience.facultyName'] = publisher.facultyName;
    }
    if (publisher.role === 'department_admin') {
      if (!publisher.departmentId) throw statusError('No department scope is assigned.', 403);
      filter['audience.departmentId'] = publisher.departmentId;
    }
    return announcementRepository.listManagement(actor.universityId, filter, input);
  }

  async detail(actor: RequestActor, announcementId: string): Promise<AnnouncementSummary> {
    const record = await announcementRepository.findById(actor.universityId, announcementId);
    if (!record) throw statusError('Announcement was not found.', 404);
    if (actor.permissions.includes('announcements:write')) {
      await this.manageable(actor, announcementId);
      return announcementView(record.toObject());
    }
    const receipt = await announcementRepository.hasReceipt(
      actor.universityId,
      announcementId,
      actor.id,
    );
    if (!receipt || record.status !== 'published')
      throw statusError('Announcement was not found.', 404);
    return announcementView(record.toObject());
  }

  async schedule(actor: RequestActor, announcementId: string, publishAt: string) {
    const record = await this.manageable(actor, announcementId);
    if (!['draft', 'scheduled'].includes(record.status))
      throw statusError('Only draft announcements can be scheduled.', 409);
    const date = new Date(publishAt);
    if (date <= new Date()) throw statusError('Publish time must be in the future.', 422);
    record.set({ status: 'scheduled', publishAt: date, updatedBy: actor.id });
    await record.save();
    await auditService.record({
      action: 'announcement.scheduled',
      resourceType: 'announcement',
      resourceId: announcementId,
      actor,
      newValue: { publishAt },
    });
    return announcementView(record.toObject());
  }

  async publish(actor: RequestActor, announcementId: string) {
    const record = await this.manageable(actor, announcementId);
    return this.publishRecord(record, actor);
  }

  async publishScheduled(universityId: string, announcementId: string) {
    const record = await announcementRepository.findById(universityId, announcementId);
    if (!record) return;
    const actor = {
      id: String(record.publisherId),
      universityId: String(record.universityId),
    };
    return this.publishRecord(record, actor);
  }

  private async publishRecord(
    record: AnnouncementDocument | null,
    auditActor: Pick<RequestActor, 'id' | 'universityId'>,
  ) {
    if (!record) throw statusError('Announcement was not found.', 404);
    if (!['draft', 'scheduled'].includes(record.status))
      throw statusError('Announcement is not available for publication.', 409);
    if (record.expiresAt && record.expiresAt <= new Date())
      throw statusError('Expired announcements cannot be published.', 409);
    const summary = announcementView(record.toObject());
    const recipients = await announcementRepository.resolveRecipients(
      auditActor.universityId,
      summary.audience,
    );
    if (!recipients.length) throw statusError('No active users match this audience.', 422);
    await announcementRepository.ensureReceipts(
      auditActor.universityId,
      String(record._id),
      recipients.map((recipient) => String(recipient._id)),
    );
    const publishedAt = new Date();
    record.set({
      status: 'published',
      publishedAt,
      publishAt: record.publishAt ?? publishedAt,
      updatedBy: auditActor.id,
      publicationClaimedAt: undefined,
      nextPublishAttemptAt: undefined,
    });
    await record.save();

    for (let start = 0; start < recipients.length; start += 25) {
      const batch = recipients.slice(start, start + 25);
      await Promise.all(
        batch.map(async (recipient) => {
          const recipientId = String(recipient._id);
          let delivered = false;
          let lastFailure = 'channel_unavailable';
          for (const channel of summary.channels) {
            try {
              if (channel === 'in_app')
                await notificationService.create({
                  universityId: auditActor.universityId,
                  recipientId,
                  title: summary.title,
                  body: summary.message.slice(0, 2000),
                  category: 'announcement',
                  priority: summary.priority,
                  metadata: { announcementId: summary.id },
                  deliveryKey: `announcement:${summary.id}:in_app:${recipientId}`,
                });
              if (channel === 'email')
                await emailService.sendAnnouncement(
                  recipient.email,
                  `${recipient.firstName} ${recipient.lastName}`,
                  { title: summary.title, message: summary.message, announcementId: summary.id },
                );
              if (channel === 'push')
                await pushDeliveryService.send(auditActor.universityId, recipientId, {
                  title: summary.title,
                  body: summary.message.slice(0, 500),
                  url: `/app/announcements?announcement=${summary.id}`,
                  tag: `announcement-${summary.id}`,
                });
              delivered = true;
            } catch (error) {
              lastFailure = failureCode(error);
            }
          }
          await announcementRepository.updateDelivery(
            auditActor.universityId,
            summary.id,
            recipientId,
            delivered,
            lastFailure,
          );
        }),
      );
    }
    socketService.emitToUniversity(auditActor.universityId, 'announcement:published', {
      id: summary.id,
      title: summary.title,
      priority: summary.priority,
    });
    await auditService.record({
      action: 'announcement.published',
      resourceType: 'announcement',
      resourceId: summary.id,
      actor: auditActor,
      metadata: { recipientCount: recipients.length, channels: summary.channels },
    });
    return announcementView(record.toObject());
  }

  async archive(actor: RequestActor, announcementId: string) {
    const record = await this.manageable(actor, announcementId);
    if (record.status !== 'published')
      throw statusError('Only published announcements can be archived.', 409);
    record.set({ status: 'archived', updatedBy: actor.id });
    await record.save();
    await auditService.record({
      action: 'announcement.archived',
      resourceType: 'announcement',
      resourceId: announcementId,
      actor,
    });
    return announcementView(record.toObject());
  }

  async cancel(actor: RequestActor, announcementId: string, reason: string) {
    const record = await this.manageable(actor, announcementId);
    if (!['draft', 'scheduled'].includes(record.status))
      throw statusError('Only draft or scheduled announcements can be cancelled.', 409);
    record.set({ status: 'cancelled', updatedBy: actor.id });
    await record.save();
    socketService.emitToUniversity(actor.universityId, 'announcement:cancelled', {
      id: announcementId,
    });
    await auditService.record({
      action: 'announcement.cancelled',
      resourceType: 'announcement',
      resourceId: announcementId,
      actor,
      metadata: { reason },
    });
    return announcementView(record.toObject());
  }

  async pin(actor: RequestActor, announcementId: string, pinned: boolean) {
    const record = await this.manageable(actor, announcementId);
    record.set({ pinned, updatedBy: actor.id });
    await record.save();
    await auditService.record({
      action: pinned ? 'announcement.pinned' : 'announcement.unpinned',
      resourceType: 'announcement',
      resourceId: announcementId,
      actor,
    });
    return announcementView(record.toObject());
  }

  async markRead(actor: RequestActor, announcementId: string) {
    const receipt = await announcementRepository.markReceipt(
      actor.universityId,
      announcementId,
      actor.id,
      'readAt',
    );
    if (!receipt) throw statusError('Announcement was not found.', 404);
  }

  async acknowledge(actor: RequestActor, announcementId: string) {
    const record = await announcementRepository.findById(actor.universityId, announcementId);
    if (!record?.acknowledgementRequired)
      throw statusError('This announcement does not require acknowledgement.', 409);
    const receipt = await announcementRepository.markReceipt(
      actor.universityId,
      announcementId,
      actor.id,
      'acknowledgedAt',
    );
    if (!receipt) throw statusError('Announcement was not found.', 404);
    socketService.emitToUser(String(record.publisherId), 'announcement:acknowledged', {
      announcementId,
      recipientId: actor.id,
    });
  }

  async delivery(actor: RequestActor, announcementId: string) {
    await this.manageable(actor, announcementId);
    return announcementRepository.deliverySummary(actor.universityId, announcementId);
  }

  private async manageable(actor: RequestActor, announcementId: string) {
    const record = await announcementRepository.findById(actor.universityId, announcementId);
    if (!record) throw statusError('Announcement was not found.', 404);
    const publisher = await this.publisher(actor);
    if (publisher.role === 'super_admin' || publisher.role === 'university_admin') return record;
    if (publisher.role === 'lecturer' && String(record.publisherId) === actor.id) return record;
    const audience = announcementView(record.toObject()).audience;
    if (publisher.role === 'faculty_admin' && audience.facultyName === publisher.facultyName)
      return record;
    if (publisher.role === 'department_admin' && audience.departmentId === publisher.departmentId)
      return record;
    throw statusError('This announcement is outside your publishing scope.', 403);
  }
}

export const announcementService = new AnnouncementService();
