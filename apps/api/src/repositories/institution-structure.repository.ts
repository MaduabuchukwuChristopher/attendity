import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import type {
  CreateInstitutionStructureInput,
  InstitutionStructureListInput,
  UpdateInstitutionStructureInput,
} from '../validators/institution-structure.validator.js';
import type { FilterQuery } from 'mongoose';

export class InstitutionStructureRepository {
  async list(universityId: string, input: InstitutionStructureListInput) {
    const filter: FilterQuery<unknown> = {
      universityId,
      ...(input.kind === 'all' ? {} : { kind: input.kind }),
      ...(input.status === 'all' ? {} : { status: input.status }),
      ...(input.search
        ? {
            $or: [
              { code: { $regex: input.search, $options: 'i' } },
              { name: { $regex: input.search, $options: 'i' } },
            ],
          }
        : {}),
    };
    const skip = (input.page - 1) * input.limit;
    const [items, total] = await Promise.all([
      InstitutionStructureModel.find(filter)
        .populate('parentId', 'kind code name')
        .sort({ kind: 1, name: 1 })
        .skip(skip)
        .limit(input.limit)
        .lean()
        .exec(),
      InstitutionStructureModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  findById(universityId: string, structureId: string) {
    return InstitutionStructureModel.findOne({ _id: structureId, universityId }).exec();
  }

  findParent(universityId: string, parentId: string) {
    return InstitutionStructureModel.findOne({
      _id: parentId,
      universityId,
      status: 'active',
    })
      .select('kind code name')
      .exec();
  }

  async hasActiveChildren(universityId: string, parentId: string): Promise<boolean> {
    return Boolean(
      await InstitutionStructureModel.exists({ universityId, parentId, status: 'active' }),
    );
  }

  create(universityId: string, actorId: string, input: CreateInstitutionStructureInput) {
    return InstitutionStructureModel.create({
      ...input,
      universityId,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  async clearCurrent(universityId: string, kind: string, exceptId?: string) {
    await InstitutionStructureModel.updateMany(
      {
        universityId,
        kind,
        isCurrent: true,
        ...(exceptId ? { _id: { $ne: exceptId } } : {}),
      },
      { $set: { isCurrent: false } },
    ).exec();
  }

  async update(
    record: Awaited<ReturnType<InstitutionStructureRepository['findById']>>,
    actorId: string,
    input: UpdateInstitutionStructureInput,
  ) {
    if (!record) return null;
    record.set({ ...input, updatedBy: actorId });
    await record.save();
    return record;
  }
}

export const institutionStructureRepository = new InstitutionStructureRepository();
