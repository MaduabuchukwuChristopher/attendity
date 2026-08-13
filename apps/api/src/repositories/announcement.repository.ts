import type {
  AnnouncementAudience,
  AnnouncementDeliverySummary,
  AnnouncementPage,
  AnnouncementSummary,
  UserRole,
} from '@qr/types';
import { type FilterQuery, Types } from 'mongoose';
import { AnnouncementModel, type AnnouncementRecord } from '../models/announcement.model.js';
import { AnnouncementReceiptModel } from '../models/announcement-receipt.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { CourseModel } from '../models/course.model.js';
import { UserModel } from '../models/user.model.js';
import type {
  AnnouncementListInput,
  AnnouncementManagementInput,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '../validators/announcement.validator.js';

interface AnnouncementViewSource {
  readonly _id: unknown;
  readonly title: string;
  readonly message: string;
  readonly category: AnnouncementSummary['category'];
  readonly priority: AnnouncementSummary['priority'];
  readonly status: AnnouncementSummary['status'];
  readonly publisherId: unknown;
  readonly publisherName: string;
  readonly audience: {
    readonly campus?: string | null;
    readonly facultyName?: string | null;
    readonly departmentId?: Types.ObjectId | string | null;
    readonly programme?: string | null;
    readonly level?: string | null;
    readonly courseId?: Types.ObjectId | string | null;
    readonly roles?: readonly UserRole[];
  };
  readonly attachments?: readonly {
    readonly assetId?: unknown;
    readonly name: string;
    readonly url: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  }[];
  readonly channels?: AnnouncementSummary['channels'];
  readonly pinned: boolean;
  readonly acknowledgementRequired: boolean;
  readonly publishAt?: Date | null;
  readonly publishedAt?: Date | null;
  readonly expiresAt?: Date | null;
  readonly readAt?: Date | null;
  readonly acknowledgedAt?: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

function audienceView(audience: AnnouncementViewSource['audience']): AnnouncementAudience {
  return {
    roles: audience.roles ?? [],
    ...(audience.campus ? { campus: audience.campus } : {}),
    ...(audience.facultyName ? { facultyName: audience.facultyName } : {}),
    ...(audience.departmentId ? { departmentId: String(audience.departmentId) } : {}),
    ...(audience.programme ? { programme: audience.programme } : {}),
    ...(audience.level ? { level: audience.level } : {}),
    ...(audience.courseId ? { courseId: String(audience.courseId) } : {}),
  };
}

function stringId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return value instanceof Types.ObjectId ? value.toHexString() : undefined;
}

export function announcementView(source: AnnouncementViewSource): AnnouncementSummary {
  return {
    id: String(source._id),
    title: source.title,
    message: source.message,
    category: source.category,
    priority: source.priority,
    status: source.status,
    publisherId: String(source.publisherId),
    publisherName: source.publisherName,
    audience: audienceView(source.audience),
    attachments: (source.attachments ?? []).map(({ assetId, ...attachment }) => {
      const normalizedAssetId = stringId(assetId);
      return {
        ...attachment,
        ...(normalizedAssetId ? { assetId: normalizedAssetId } : {}),
      };
    }),
    channels: source.channels ?? ['in_app'],
    pinned: source.pinned,
    acknowledgementRequired: source.acknowledgementRequired,
    ...(source.publishAt ? { publishAt: source.publishAt.toISOString() } : {}),
    ...(source.publishedAt ? { publishedAt: source.publishedAt.toISOString() } : {}),
    ...(source.expiresAt ? { expiresAt: source.expiresAt.toISOString() } : {}),
    ...(source.readAt ? { readAt: source.readAt.toISOString() } : {}),
    ...(source.acknowledgedAt ? { acknowledgedAt: source.acknowledgedAt.toISOString() } : {}),
    createdAt: (source.createdAt ?? new Date()).toISOString(),
    updatedAt: (source.updatedAt ?? source.createdAt ?? new Date()).toISOString(),
  };
}

function searchFilter(search: string): FilterQuery<AnnouncementRecord> {
  return search ? { $text: { $search: search } } : {};
}

function priorityRank(priority: AnnouncementSummary['priority']): number {
  return { low: 1, normal: 2, high: 3, urgent: 4 }[priority];
}

function announcementSort(
  sort: AnnouncementListInput['sort'],
  dateField: 'createdAt' | 'publishedAt',
): Record<string, 1 | -1> {
  if (sort === 'oldest') return { pinned: -1, [dateField]: 1 };
  if (sort === 'priority') return { pinned: -1, priorityRank: -1, [dateField]: -1 };
  if (sort === 'expires_soon') return { pinned: -1, expiresAt: 1, [dateField]: -1 };
  return { pinned: -1, [dateField]: -1 };
}

export class AnnouncementRepository {
  async create(
    universityId: string,
    publisherId: string,
    publisherName: string,
    input: CreateAnnouncementInput,
  ) {
    return AnnouncementModel.create({
      ...input,
      priorityRank: priorityRank(input.priority),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      universityId,
      publisherId,
      publisherName,
      status: 'draft',
      createdBy: publisherId,
      updatedBy: publisherId,
    });
  }

  findById(universityId: string, announcementId: string) {
    return AnnouncementModel.findOne({ _id: announcementId, universityId }).exec();
  }

  async update(
    universityId: string,
    announcementId: string,
    actorId: string,
    input: UpdateAnnouncementInput,
  ) {
    return AnnouncementModel.findOneAndUpdate(
      { _id: announcementId, universityId },
      {
        $set: {
          ...input,
          ...(input.priority ? { priorityRank: priorityRank(input.priority) } : {}),
          ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {}),
          updatedBy: actorId,
        },
        ...(input.expiresAt === undefined ? {} : { $unset: {} }),
      },
      { new: true, runValidators: true },
    ).exec();
  }

  async listManagement(
    universityId: string,
    publisherFilter: Readonly<Record<string, unknown>>,
    input: AnnouncementManagementInput,
  ): Promise<AnnouncementPage> {
    const filter: FilterQuery<AnnouncementRecord> = {
      universityId,
      ...publisherFilter,
      ...searchFilter(input.search),
      ...(input.status === 'all' ? {} : { status: input.status }),
    };
    const [items, total] = await Promise.all([
      AnnouncementModel.find(filter)
        .sort(announcementSort(input.sort, 'createdAt'))
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      AnnouncementModel.countDocuments(filter),
    ]);
    return {
      items: items.map((item) => announcementView(item as unknown as AnnouncementViewSource)),
      unread: 0,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  async listFeed(
    universityId: string,
    recipientId: string,
    input: AnnouncementListInput,
  ): Promise<AnnouncementPage> {
    const receiptFilter: Record<string, unknown> = {
      universityId,
      recipientId,
      ...(input.status === 'unread' ? { readAt: { $exists: false } } : {}),
      ...(input.status === 'read' ? { readAt: { $exists: true } } : {}),
      ...(input.status === 'acknowledged' ? { acknowledgedAt: { $exists: true } } : {}),
    };
    const receipts = await AnnouncementReceiptModel.find(receiptFilter)
      .select('announcementId readAt acknowledgedAt')
      .lean()
      .exec();
    const receiptMap = new Map(receipts.map((item) => [String(item.announcementId), item]));
    const announcementIds = [...receiptMap.keys()];
    const now = new Date();
    const filter: FilterQuery<AnnouncementRecord> = {
      _id: { $in: announcementIds },
      universityId,
      status: 'published',
      $and: [
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] },
        ...(input.search ? [searchFilter(input.search)] : []),
      ],
      ...(input.category === 'all' ? {} : { category: input.category }),
      ...(input.priority === 'all' ? {} : { priority: input.priority }),
    };
    const [items, total, unread] = await Promise.all([
      AnnouncementModel.find(filter)
        .sort(announcementSort(input.sort, 'publishedAt'))
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      AnnouncementModel.countDocuments(filter),
      AnnouncementReceiptModel.countDocuments({
        universityId,
        recipientId,
        readAt: { $exists: false },
      }),
    ]);
    return {
      items: items.map((item) => {
        const receipt = receiptMap.get(String(item._id));
        return announcementView({
          ...(item as unknown as AnnouncementViewSource),
          ...(receipt?.readAt ? { readAt: receipt.readAt } : {}),
          ...(receipt?.acknowledgedAt ? { acknowledgedAt: receipt.acknowledgedAt } : {}),
        });
      }),
      unread,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  async resolveRecipients(universityId: string, audience: AnnouncementAudience) {
    let allowedIds: string[] | undefined;
    if (audience.courseId) {
      const [registrations, course] = await Promise.all([
        CourseRegistrationModel.find({
          universityId,
          courseId: audience.courseId,
          status: 'approved',
        })
          .select('studentId')
          .lean()
          .exec(),
        CourseModel.findOne({ _id: audience.courseId, universityId })
          .select('lecturerId')
          .lean()
          .exec(),
      ]);
      allowedIds = registrations.map((registration) => String(registration.studentId));
      if (course?.lecturerId) allowedIds.push(String(course.lecturerId));
    }
    const filter: Record<string, unknown> = {
      universityId,
      accountStatus: 'active',
      ...(allowedIds ? { _id: { $in: allowedIds } } : {}),
      ...(audience.roles.length ? { role: { $in: audience.roles } } : {}),
      ...(audience.campus ? { campus: audience.campus } : {}),
      ...(audience.facultyName ? { facultyName: audience.facultyName } : {}),
      ...(audience.departmentId ? { departmentId: audience.departmentId } : {}),
      ...(audience.programme ? { programme: audience.programme } : {}),
      ...(audience.level ? { level: audience.level } : {}),
    };
    return UserModel.find(filter)
      .select('_id email firstName lastName role')
      .limit(50_000)
      .lean()
      .exec();
  }

  async ensureReceipts(
    universityId: string,
    announcementId: string,
    recipientIds: readonly string[],
  ) {
    if (!recipientIds.length) return;
    const tenantObjectId = new Types.ObjectId(universityId);
    const announcementObjectId = new Types.ObjectId(announcementId);
    await AnnouncementReceiptModel.bulkWrite(
      recipientIds.map((recipientId) => {
        const recipientObjectId = new Types.ObjectId(recipientId);
        return {
          updateOne: {
            filter: {
              universityId: tenantObjectId,
              announcementId: announcementObjectId,
              recipientId: recipientObjectId,
            },
            update: {
              $setOnInsert: {
                universityId: tenantObjectId,
                announcementId: announcementObjectId,
                recipientId: recipientObjectId,
                deliveryStatus: 'pending' as const,
                createdBy: recipientObjectId,
                updatedBy: recipientObjectId,
              },
            },
            upsert: true,
          },
        };
      }),
      { ordered: false },
    );
  }

  async updateDelivery(
    universityId: string,
    announcementId: string,
    recipientId: string,
    delivered: boolean,
    failureCode?: string,
  ) {
    await AnnouncementReceiptModel.updateOne(
      { universityId, announcementId, recipientId },
      {
        $set: {
          deliveryStatus: delivered ? 'delivered' : 'failed',
          ...(delivered ? { deliveredAt: new Date() } : { failureCode: failureCode ?? 'failed' }),
          updatedBy: recipientId,
        },
      },
    ).exec();
  }

  async markReceipt(
    universityId: string,
    announcementId: string,
    recipientId: string,
    field: 'readAt' | 'acknowledgedAt',
  ) {
    return AnnouncementReceiptModel.findOneAndUpdate(
      { universityId, announcementId, recipientId },
      { $set: { [field]: new Date(), updatedBy: recipientId } },
      { new: true },
    ).exec();
  }

  async hasReceipt(universityId: string, announcementId: string, recipientId: string) {
    return Boolean(
      await AnnouncementReceiptModel.exists({ universityId, announcementId, recipientId }),
    );
  }

  async deliverySummary(
    universityId: string,
    announcementId: string,
  ): Promise<AnnouncementDeliverySummary> {
    const rows = await AnnouncementReceiptModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          universityId: new Types.ObjectId(universityId),
          announcementId: new Types.ObjectId(announcementId),
        },
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          delivered: [{ $match: { deliveryStatus: 'delivered' } }, { $count: 'count' }],
          failed: [{ $match: { deliveryStatus: 'failed' } }, { $count: 'count' }],
          read: [{ $match: { readAt: { $type: 'date' } } }, { $count: 'count' }],
          acknowledged: [{ $match: { acknowledgedAt: { $type: 'date' } } }, { $count: 'count' }],
        },
      },
    ]).exec();
    const facets = rows[0] as unknown as Record<string, readonly { count: number }[]> | undefined;
    const count = (name: string) => facets?.[name]?.[0]?.count ?? 0;
    return {
      targeted: count('total'),
      delivered: count('delivered'),
      failed: count('failed'),
      read: count('read'),
      acknowledged: count('acknowledged'),
    };
  }
}

export const announcementRepository = new AnnouncementRepository();
