import type {
  AcademicStructureItem,
  AcademicStructureKind,
  AcademicStructurePage,
  RequestActor,
} from '@qr/types';
import { institutionStructureRepository } from '../repositories/institution-structure.repository.js';
import type {
  CreateInstitutionStructureInput,
  InstitutionStructureListInput,
  UpdateInstitutionStructureInput,
} from '../validators/institution-structure.validator.js';
import { auditService } from './audit.service.js';

const allowedParents: Readonly<Record<AcademicStructureKind, readonly AcademicStructureKind[]>> = {
  campus: [],
  faculty: ['campus'],
  programme: ['faculty'],
  level: ['programme'],
  academic_session: [],
  term: ['academic_session'],
  venue: ['campus'],
};

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function date(value: unknown): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

function summary(source: Record<string, unknown>): AcademicStructureItem {
  const parent =
    source.parentId && typeof source.parentId === 'object'
      ? (source.parentId as Record<string, unknown>)
      : undefined;
  const startsAt = date(source.startsAt);
  const endsAt = date(source.endsAt);
  return {
    id: String(source._id),
    kind: source.kind as AcademicStructureKind,
    code: String(source.code),
    name: String(source.name),
    ...(typeof source.description === 'string' ? { description: source.description } : {}),
    ...(parent
      ? {
          parent: {
            id: String(parent._id),
            kind: parent.kind as AcademicStructureKind,
            code: String(parent.code),
            name: String(parent.name),
          },
        }
      : {}),
    ...(startsAt ? { startsAt } : {}),
    ...(endsAt ? { endsAt } : {}),
    isCurrent: Boolean(source.isCurrent),
    status: source.status === 'inactive' ? 'inactive' : 'active',
    createdAt: date(source.createdAt) ?? new Date(0).toISOString(),
    updatedAt: date(source.updatedAt) ?? new Date(0).toISOString(),
  };
}

export class InstitutionStructureService {
  private async assertParent(actor: RequestActor, kind: AcademicStructureKind, parentId?: string) {
    if (!parentId) return;
    const parent = await institutionStructureRepository.findParent(actor.universityId, parentId);
    if (!parent) throw statusError('The selected parent record is unavailable.', 422);
    if (!allowedParents[kind].includes(parent.kind))
      throw statusError(`A ${kind.replaceAll('_', ' ')} cannot use that parent record.`, 422);
  }

  private assertCurrent(kind: AcademicStructureKind, isCurrent: boolean | undefined) {
    if (isCurrent && !['academic_session', 'term'].includes(kind))
      throw statusError('Only academic sessions and terms can be marked current.', 422);
  }

  async list(
    actor: RequestActor,
    input: InstitutionStructureListInput,
  ): Promise<AcademicStructurePage> {
    const result = await institutionStructureRepository.list(actor.universityId, input);
    return {
      items: result.items.map((item) => summary(item as unknown as Record<string, unknown>)),
      pagination: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        pages: Math.max(1, Math.ceil(result.total / input.limit)),
      },
    };
  }

  async create(actor: RequestActor, input: CreateInstitutionStructureInput) {
    await this.assertParent(actor, input.kind, input.parentId);
    this.assertCurrent(input.kind, input.isCurrent);
    if (input.isCurrent)
      await institutionStructureRepository.clearCurrent(actor.universityId, input.kind);
    const record = await institutionStructureRepository.create(actor.universityId, actor.id, input);
    await record.populate('parentId', 'kind code name');
    await auditService.record({
      action: 'institution_structure.created',
      resourceType: 'institution_structure',
      resourceId: record.id,
      actor,
      newValue: record.toJSON(),
    });
    return summary(record.toJSON());
  }

  async update(actor: RequestActor, structureId: string, input: UpdateInstitutionStructureInput) {
    const record = await institutionStructureRepository.findById(actor.universityId, structureId);
    if (!record) throw statusError('Academic structure record was not found.', 404);
    const kind = record.kind;
    await this.assertParent(actor, kind, input.parentId);
    this.assertCurrent(kind, input.isCurrent);
    const startsAt = input.startsAt ? new Date(input.startsAt) : record.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : record.endsAt;
    if (startsAt && endsAt && endsAt <= startsAt)
      throw statusError('The end date must be later than the start date.', 422);
    if (input.isCurrent)
      await institutionStructureRepository.clearCurrent(actor.universityId, kind, structureId);
    const previous = record.toJSON();
    const updated = await institutionStructureRepository.update(record, actor.id, input);
    if (!updated) throw statusError('Academic structure record was not found.', 404);
    await updated.populate('parentId', 'kind code name');
    await auditService.record({
      action: 'institution_structure.updated',
      resourceType: 'institution_structure',
      resourceId: updated.id,
      actor,
      oldValue: previous,
      newValue: updated.toJSON(),
    });
    return summary(updated.toJSON());
  }

  async deactivate(actor: RequestActor, structureId: string) {
    const record = await institutionStructureRepository.findById(actor.universityId, structureId);
    if (!record) throw statusError('Academic structure record was not found.', 404);
    if (record.status === 'inactive') return summary(record.toJSON());
    if (await institutionStructureRepository.hasActiveChildren(actor.universityId, structureId))
      throw statusError('Deactivate or reassign active child records first.', 409);
    const previous = record.toJSON();
    const updated = await institutionStructureRepository.update(record, actor.id, {
      status: 'inactive',
      isCurrent: false,
    });
    if (!updated) throw statusError('Academic structure record was not found.', 404);
    await auditService.record({
      action: 'institution_structure.deactivated',
      resourceType: 'institution_structure',
      resourceId: updated.id,
      actor,
      oldValue: previous,
      newValue: updated.toJSON(),
    });
    return summary(updated.toJSON());
  }
}

export const institutionStructureService = new InstitutionStructureService();
