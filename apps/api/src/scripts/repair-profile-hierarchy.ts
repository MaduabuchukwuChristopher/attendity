import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import mongoose, { type ClientSession, type Types } from 'mongoose';
import { logger } from '../config/logger.js';
import { connectDatabase, disconnectDatabase } from '../database/mongodb.js';
import { CurriculumMappingModel } from '../models/curriculum-mapping.model.js';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { StudentProfileModel } from '../models/student-profile.model.js';
import { UniversityModel } from '../models/university.model.js';

export interface RepairSummary {
  facultiesLinked: number;
  levelsCreated: number;
  studentProfilesUpdated: number;
  curriculumMappingsUpdated: number;
  ambiguousInstitutions: number;
}

function emptySummary(): RepairSummary {
  return {
    facultiesLinked: 0,
    levelsCreated: 0,
    studentProfilesUpdated: 0,
    curriculumMappingsUpdated: 0,
    ambiguousInstitutions: 0,
  };
}

function repairedLevelCode(programmeId: Types.ObjectId, legacyCode: string): string {
  const normalized = legacyCode
    .replace(/[^A-Z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
  const suffix = createHash('sha1').update(String(programmeId)).digest('hex').slice(0, 8);
  return `LVL-${normalized.slice(0, 18)}-${suffix}`.slice(0, 32);
}

async function tenantIds(universityId?: string): Promise<Types.ObjectId[]> {
  if (universityId) {
    if (!mongoose.isValidObjectId(universityId))
      throw new Error('A valid institution ID is required.');
    return [new mongoose.Types.ObjectId(universityId)];
  }
  const institutions = await UniversityModel.find({ status: 'active' }).select('_id').lean().exec();
  return institutions.map((institution) => institution._id);
}

async function repairTenant(
  universityId: Types.ObjectId,
  session: ClientSession,
): Promise<RepairSummary> {
  const summary = emptySummary();
  const campuses = await InstitutionStructureModel.find({
    universityId,
    kind: 'campus',
    status: 'active',
  })
    .select('_id')
    .session(session)
    .lean()
    .exec();
  const unparentedFaculties = await InstitutionStructureModel.countDocuments({
    universityId,
    kind: 'faculty',
    status: 'active',
    parentId: { $exists: false },
  }).session(session);
  if (unparentedFaculties && campuses.length !== 1) {
    summary.ambiguousInstitutions = 1;
  } else if (unparentedFaculties && campuses[0]) {
    const result = await InstitutionStructureModel.updateMany(
      {
        universityId,
        kind: 'faculty',
        status: 'active',
        parentId: { $exists: false },
      },
      { $set: { parentId: campuses[0]._id } },
      { session },
    ).exec();
    summary.facultiesLinked += result.modifiedCount;
  }

  const [profiles, mappings] = await Promise.all([
    StudentProfileModel.find({ universityId })
      .select('programmeId levelId')
      .session(session)
      .lean()
      .exec(),
    CurriculumMappingModel.find({ universityId })
      .select('courseId programmeId levelId termId')
      .session(session)
      .lean()
      .exec(),
  ]);
  const pairs = new Map<string, { programmeId: Types.ObjectId; levelId: Types.ObjectId }>();
  for (const row of [...profiles, ...mappings]) {
    const key = `${String(row.programmeId)}:${String(row.levelId)}`;
    pairs.set(key, {
      programmeId: row.programmeId,
      levelId: row.levelId,
    });
  }
  const structureIds = [
    ...new Set(
      [...pairs.values()].flatMap((pair) => [String(pair.programmeId), String(pair.levelId)]),
    ),
  ];
  const structures = structureIds.length
    ? await InstitutionStructureModel.find({
        universityId,
        _id: { $in: structureIds },
        status: 'active',
      })
        .session(session)
        .lean()
        .exec()
    : [];
  const structuresById = new Map(structures.map((item) => [String(item._id), item]));

  for (const pair of pairs.values()) {
    const programme = structuresById.get(String(pair.programmeId));
    const legacyLevel = structuresById.get(String(pair.levelId));
    if (programme?.kind !== 'programme' || legacyLevel?.kind !== 'level') continue;
    if (String(legacyLevel.parentId ?? '') === String(pair.programmeId)) continue;
    const code = repairedLevelCode(pair.programmeId, legacyLevel.code);
    const existingLevel = await InstitutionStructureModel.findOne({
      universityId,
      kind: 'level',
      code,
    })
      .session(session)
      .exec();
    let repairedLevel = existingLevel;
    if (!repairedLevel) {
      const [createdLevel] = await InstitutionStructureModel.create(
        [
          {
            universityId,
            kind: 'level',
            code,
            name: legacyLevel.name,
            description: legacyLevel.description,
            parentId: pair.programmeId,
            isCurrent: false,
            status: 'active',
          },
        ],
        { session },
      );
      if (!createdLevel) throw new Error('The programme-specific level could not be created.');
      repairedLevel = createdLevel;
      summary.levelsCreated += 1;
    }

    const profileResult = await StudentProfileModel.updateMany(
      { universityId, programmeId: pair.programmeId, levelId: pair.levelId },
      { $set: { levelId: repairedLevel._id } },
      { session },
    ).exec();
    summary.studentProfilesUpdated += profileResult.modifiedCount;

    const affectedMappings = await CurriculumMappingModel.find({
      universityId,
      programmeId: pair.programmeId,
      levelId: pair.levelId,
    })
      .session(session)
      .exec();
    for (const mapping of affectedMappings) {
      const duplicate = await CurriculumMappingModel.exists({
        _id: { $ne: mapping._id },
        universityId,
        courseId: mapping.courseId,
        programmeId: pair.programmeId,
        levelId: repairedLevel._id,
        termId: mapping.termId,
      }).session(session);
      if (duplicate) await mapping.deleteOne({ session });
      else await mapping.updateOne({ $set: { levelId: repairedLevel._id } }, { session });
      summary.curriculumMappingsUpdated += 1;
    }
  }
  return summary;
}

export async function repairProfileHierarchy(universityId?: string): Promise<RepairSummary> {
  const total = emptySummary();
  for (const tenantId of await tenantIds(universityId)) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const tenantSummary = await repairTenant(tenantId, session);
        total.facultiesLinked += tenantSummary.facultiesLinked;
        total.levelsCreated += tenantSummary.levelsCreated;
        total.studentProfilesUpdated += tenantSummary.studentProfilesUpdated;
        total.curriculumMappingsUpdated += tenantSummary.curriculumMappingsUpdated;
        total.ambiguousInstitutions += tenantSummary.ambiguousInstitutions;
      });
    } finally {
      await session.endSession();
    }
  }
  return total;
}

const executedDirectly = Boolean(
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url,
);

if (executedDirectly) {
  if (process.env.ALLOW_PROFILE_HIERARCHY_REPAIR !== 'true')
    throw new Error('Set ALLOW_PROFILE_HIERARCHY_REPAIR=true to repair profile hierarchy data.');
  void connectDatabase()
    .then(() => repairProfileHierarchy(process.env.PROFILE_HIERARCHY_UNIVERSITY_ID))
    .then((summary) => logger.info(summary, 'Profile hierarchy repair completed'))
    .catch((error: unknown) => {
      logger.error({ error }, 'Profile hierarchy repair failed');
      process.exitCode = 1;
    })
    .finally(disconnectDatabase);
}
