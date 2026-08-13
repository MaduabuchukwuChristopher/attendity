import type { AuditLogPage, RequestActor } from '@qr/types';
import { AuditLogModel } from '../models/audit-log.model.js';
import type { AuditListInput } from '../validators/audit.validator.js';

interface AuditEvent {
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly actor: Pick<RequestActor, 'id' | 'universityId'>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
  readonly metadata?: Record<string, unknown>;
}
export class AuditService {
  async record(event: AuditEvent): Promise<void> {
    await AuditLogModel.create({
      universityId: event.actor.universityId,
      createdBy: event.actor.id,
      updatedBy: event.actor.id,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      oldValue: event.oldValue,
      newValue: event.newValue,
      metadata: event.metadata ?? {},
    });
  }

  async list(actor: RequestActor, input: AuditListInput): Promise<AuditLogPage> {
    const createdAt =
      input.from || input.to
        ? {
            ...(input.from ? { $gte: new Date(input.from) } : {}),
            ...(input.to ? { $lte: new Date(input.to) } : {}),
          }
        : undefined;
    const filter = {
      universityId: actor.universityId,
      ...(input.action === 'all' ? {} : { action: input.action }),
      ...(input.resourceType === 'all' ? {} : { resourceType: input.resourceType }),
      ...(createdAt ? { createdAt } : {}),
      ...(input.search
        ? {
            $or: [
              { action: { $regex: input.search, $options: 'i' } },
              { resourceType: { $regex: input.search, $options: 'i' } },
              { resourceId: { $regex: input.search, $options: 'i' } },
            ],
          }
        : {}),
    };
    const [items, total, actions, resourceTypes] = await Promise.all([
      AuditLogModel.find(filter)
        .select('action resourceType resourceId createdBy oldValue newValue createdAt')
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      AuditLogModel.countDocuments(filter),
      AuditLogModel.distinct('action', { universityId: actor.universityId }),
      AuditLogModel.distinct('resourceType', { universityId: actor.universityId }),
    ]);
    return {
      items: items.map((item) => {
        const oldValue =
          item.oldValue && typeof item.oldValue === 'object'
            ? Object.keys(item.oldValue as Record<string, unknown>)
            : [];
        const newValue =
          item.newValue && typeof item.newValue === 'object'
            ? Object.keys(item.newValue as Record<string, unknown>)
            : [];
        return {
          id: String(item._id),
          action: item.action,
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          ...(item.createdBy ? { actorId: String(item.createdBy) } : {}),
          changedFields: [...new Set([...oldValue, ...newValue])].filter(
            (field) => !['password', 'passwordHash', 'token', 'imageCapture'].includes(field),
          ),
          createdAt: new Date((item as unknown as { createdAt: Date }).createdAt).toISOString(),
        };
      }),
      filterOptions: { actions: actions.sort(), resourceTypes: resourceTypes.sort() },
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.max(1, Math.ceil(total / input.limit)),
      },
    };
  }
}
export const auditService = new AuditService();
