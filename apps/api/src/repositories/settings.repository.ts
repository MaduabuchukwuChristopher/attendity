import mongoose, { type ClientSession } from 'mongoose';
import type { InstitutionSettings, RequestActor } from '@qr/types';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { UniversityModel } from '../models/university.model.js';

type PersistedSettingsInput = Omit<InstitutionSettings, 'terminology' | 'logoAssetId'>;

function isStandaloneTransactionError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 20;
}

export class SettingsRepository {
  async find(actor: RequestActor) {
    const institution = await UniversityModel.findById(actor.universityId).exec();
    if (!institution)
      throw Object.assign(new Error('Institution account was not found.'), { statusCode: 404 });
    const settings = await SystemSettingsModel.findOneAndUpdate(
      { universityId: actor.universityId },
      {
        $setOnInsert: {
          universityId: actor.universityId,
          terminologyPreset: institution.institutionType,
          staffTitlePreference:
            institution.institutionType === 'university' ? 'Lecturer' : 'Educator',
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    if (!settings)
      throw Object.assign(new Error('Institution settings could not be created.'), {
        statusCode: 500,
      });
    return { institution, settings };
  }

  async update(actor: RequestActor, input: PersistedSettingsInput) {
    const session = await mongoose.startSession();
    const persist = async (transaction?: ClientSession) => {
      const institution = await UniversityModel.findByIdAndUpdate(
        actor.universityId,
        {
          $set: {
            name: input.institutionName,
            institutionType: input.institutionType,
            countryCode: input.countryCode,
            countryName: input.countryName,
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
            ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
          },
          ...(input.logoUrl ? {} : { $unset: { logoUrl: 1 } }),
        },
        { new: true, runValidators: true, ...(transaction ? { session: transaction } : {}) },
      ).exec();
      if (!institution)
        throw Object.assign(new Error('Institution account was not found.'), { statusCode: 404 });
      const settings = await SystemSettingsModel.findOneAndUpdate(
        { universityId: actor.universityId },
        {
          $set: {
            brandingName: input.institutionName,
            terminologyPreset: input.terminologyPreset,
            terminologyOverrides: input.terminologyOverrides,
            staffTitlePreference: input.staffTitlePreference,
            studentIdentifierLabel: input.studentIdentifierLabel,
            studentIdentifierExample: input.studentIdentifierExample,
            studentIdentifierPattern: input.studentIdentifierPattern,
            studentIdentifierGuidance: input.studentIdentifierGuidance,
            timeZone: input.timeZone,
            dateFormat: input.dateFormat,
            attendanceRequirement: input.attendanceRequirement,
            qrRotationSeconds: input.qrRotationSeconds,
            gpsRadiusMetres: input.gpsRadiusMetres,
            lateArrivalMinutes: input.lateArrivalMinutes,
            academicSession: input.academicSession,
            currentSemester: input.currentSemester,
            electiveRegistrationRequiresApproval: input.electiveRegistrationRequiresApproval,
            reminderAllowedChannels: {
              inApp: input.reminderPolicy.allowedChannels.in_app,
              email: input.reminderPolicy.allowedChannels.email,
              push: input.reminderPolicy.allowedChannels.push,
              sms: input.reminderPolicy.allowedChannels.sms,
            },
            maximumReminderWindowMinutes: input.reminderPolicy.maximumWindowMinutes,
            updatedBy: actor.id,
          },
          $setOnInsert: { universityId: actor.universityId, createdBy: actor.id },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          ...(transaction ? { session: transaction } : {}),
        },
      ).exec();
      if (!settings)
        throw Object.assign(new Error('Institution settings could not be updated.'), {
          statusCode: 500,
        });
      return { institution, settings };
    };
    try {
      let result: Awaited<ReturnType<typeof persist>> | undefined;
      await session.withTransaction(async () => {
        result = await persist(session);
      });
      if (!result)
        throw Object.assign(new Error('Institution settings update did not complete.'), {
          statusCode: 500,
        });
      return result;
    } catch (error) {
      if (!isStandaloneTransactionError(error) || environment.NODE_ENV === 'production')
        throw error;
      logger.warn(
        { universityId: actor.universityId },
        'Standalone development database: applying institution settings without a transaction',
      );
      return persist();
    } finally {
      await session.endSession();
    }
  }

  async updateBranding(
    actor: RequestActor,
    branding: { readonly logoAssetId: string; readonly logoUrl: string } | null,
  ) {
    const institution = await UniversityModel.findByIdAndUpdate(
      actor.universityId,
      branding
        ? { $set: { logoAssetId: branding.logoAssetId, logoUrl: branding.logoUrl } }
        : { $unset: { logoAssetId: 1, logoUrl: 1 } },
      { new: true, runValidators: true },
    ).exec();
    if (!institution)
      throw Object.assign(new Error('Institution account was not found.'), { statusCode: 404 });
    return institution;
  }
}
