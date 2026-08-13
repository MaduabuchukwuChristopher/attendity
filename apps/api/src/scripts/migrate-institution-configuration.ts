import { connectDatabase, disconnectDatabase } from '../database/mongodb.js';
import { logger } from '../config/logger.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { UniversityModel } from '../models/university.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { UserModel } from '../models/user.model.js';

function code(prefix: string, value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
  return `${prefix}-${normalized}`.slice(0, 32);
}

async function upsertStructure(
  universityId: unknown,
  kind: 'campus' | 'faculty' | 'programme' | 'level' | 'academic_session' | 'term',
  prefix: string,
  names: readonly string[],
  currentName?: string,
) {
  for (const name of [...new Set(names.map((item) => item.trim()).filter(Boolean))])
    await InstitutionStructureModel.updateOne(
      { universityId, kind, code: code(prefix, name) },
      {
        $setOnInsert: {
          universityId,
          kind,
          code: code(prefix, name),
          name,
          status: 'active',
          isCurrent: name === currentName,
        },
      },
      { upsert: true },
    ).exec();
}

if (process.env.ALLOW_INSTITUTION_CONFIG_MIGRATION !== 'true')
  throw new Error(
    'Set ALLOW_INSTITUTION_CONFIG_MIGRATION=true to apply backward-compatible institution defaults.',
  );

async function migrate(): Promise<void> {
  await connectDatabase();
  const institutionResult = await UniversityModel.updateMany({}, [
    {
      $set: {
        institutionType: { $ifNull: ['$institutionType', 'university'] },
        countryCode: { $ifNull: ['$countryCode', 'NG'] },
        countryName: { $ifNull: ['$countryName', 'Nigeria'] },
        primaryColor: { $ifNull: ['$primaryColor', '#14532D'] },
        secondaryColor: { $ifNull: ['$secondaryColor', '#B8892D'] },
      },
    },
  ]).exec();
  const settingsResult = await SystemSettingsModel.updateMany({ deletedAt: { $exists: false } }, [
    {
      $set: {
        terminologyPreset: { $ifNull: ['$terminologyPreset', 'university'] },
        staffTitlePreference: { $ifNull: ['$staffTitlePreference', 'Lecturer'] },
        studentIdentifierLabel: { $ifNull: ['$studentIdentifierLabel', 'Student ID'] },
        timeZone: { $ifNull: ['$timeZone', 'Africa/Lagos'] },
        dateFormat: { $ifNull: ['$dateFormat', 'DD/MM/YYYY'] },
      },
    },
  ]).exec();
  const institutions = await UniversityModel.find({}).select('_id').lean().exec();
  for (const institution of institutions) {
    const universityId = institution._id;
    const [settings, campuses, userFaculties, departmentFaculties, programmes, levels] =
      await Promise.all([
        SystemSettingsModel.findOne({ universityId })
          .select('academicSession currentSemester')
          .lean()
          .exec(),
        UserModel.distinct('campus', { universityId, campus: { $nin: [null, ''] } }),
        UserModel.distinct('facultyName', { universityId, facultyName: { $nin: [null, ''] } }),
        DepartmentModel.distinct('facultyName', {
          universityId,
          facultyName: { $nin: [null, ''] },
        }),
        UserModel.distinct('programme', { universityId, programme: { $nin: [null, ''] } }),
        UserModel.distinct('level', { universityId, level: { $nin: [null, ''] } }),
      ]);
    await upsertStructure(universityId, 'campus', 'CAM', campuses);
    await upsertStructure(universityId, 'faculty', 'FAC', [
      ...userFaculties,
      ...departmentFaculties,
    ]);
    await upsertStructure(universityId, 'programme', 'PRG', programmes);
    await upsertStructure(universityId, 'level', 'LVL', levels);
    if (settings?.academicSession)
      await upsertStructure(
        universityId,
        'academic_session',
        'SES',
        [settings.academicSession],
        settings.academicSession,
      );
    if (settings?.currentSemester)
      await upsertStructure(
        universityId,
        'term',
        'TRM',
        [settings.currentSemester],
        settings.currentSemester,
      );
  }
  await InstitutionStructureModel.init();
  logger.info(
    {
      institutionsMatched: institutionResult.matchedCount,
      institutionsUpdated: institutionResult.modifiedCount,
      settingsMatched: settingsResult.matchedCount,
      settingsUpdated: settingsResult.modifiedCount,
      institutionsStructured: institutions.length,
    },
    'Institution configuration compatibility migration completed',
  );
}

void migrate()
  .catch((error: unknown) => {
    logger.error({ error }, 'Institution configuration compatibility migration failed');
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
