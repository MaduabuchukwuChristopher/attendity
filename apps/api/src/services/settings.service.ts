import { getInstitutionTerminology, isInstitutionType } from '@qr/shared';
import type { InstitutionSettings, InstitutionTerminology, RequestActor } from '@qr/types';
import { SettingsRepository } from '../repositories/settings.repository.js';
import type { UpdateSettingsInput } from '../validators/settings.validator.js';
import type { UpdateInstitutionBrandingInput } from '../validators/settings.validator.js';
import { auditService } from './audit.service.js';
import { mediaUploadService } from './media-upload.service.js';

type SettingsRecord = Awaited<ReturnType<SettingsRepository['find']>>;

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function compactOverrides(value: unknown): Partial<InstitutionTerminology> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === 'string' && entry.trim()),
  );
}

function serialize({ institution, settings }: SettingsRecord): InstitutionSettings {
  const institutionType = isInstitutionType(institution.institutionType)
    ? institution.institutionType
    : 'university';
  const terminologyPreset =
    settings.terminologyPreset === 'custom' || isInstitutionType(settings.terminologyPreset)
      ? settings.terminologyPreset
      : institutionType;
  const terminologyOverrides = compactOverrides(settings.terminologyOverrides);
  const terminologyBase = terminologyPreset === 'custom' ? institutionType : terminologyPreset;
  const terminology = getInstitutionTerminology(terminologyBase, terminologyOverrides);
  const dateFormat = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(settings.dateFormat)
    ? settings.dateFormat
    : 'DD/MM/YYYY';
  return {
    institutionName: institution.name,
    institutionType,
    countryCode: textOr(institution.countryCode, 'NG'),
    countryName: textOr(institution.countryName, 'Nigeria'),
    ...(institution.logoAssetId ? { logoAssetId: String(institution.logoAssetId) } : {}),
    ...(institution.logoUrl ? { logoUrl: institution.logoUrl } : {}),
    primaryColor: textOr(institution.primaryColor, '#14532D'),
    secondaryColor: textOr(institution.secondaryColor, '#B8892D'),
    terminologyPreset,
    terminologyOverrides,
    terminology,
    staffTitlePreference: textOr(settings.staffTitlePreference, terminology.educator),
    studentIdentifierLabel: textOr(settings.studentIdentifierLabel, 'Student ID'),
    studentIdentifierExample: textOr(settings.studentIdentifierExample, 'UNI/DEP/2026/001'),
    studentIdentifierPattern: textOr(
      settings.studentIdentifierPattern,
      '^[A-Z0-9][A-Z0-9/._-]{2,39}$',
    ),
    studentIdentifierGuidance: textOr(
      settings.studentIdentifierGuidance,
      'Enter the identifier issued by your institution.',
    ),
    timeZone: textOr(settings.timeZone, 'Africa/Lagos'),
    dateFormat,
    attendanceRequirement: settings.attendanceRequirement,
    qrRotationSeconds: settings.qrRotationSeconds,
    gpsRadiusMetres: settings.gpsRadiusMetres,
    lateArrivalMinutes: settings.lateArrivalMinutes,
    academicSession: settings.academicSession,
    currentSemester: settings.currentSemester,
    electiveRegistrationRequiresApproval: settings.electiveRegistrationRequiresApproval ?? true,
    reminderPolicy: {
      allowedChannels: {
        in_app: settings.reminderAllowedChannels?.inApp ?? true,
        email: settings.reminderAllowedChannels?.email ?? true,
        push: settings.reminderAllowedChannels?.push ?? true,
        sms: settings.reminderAllowedChannels?.sms ?? false,
      },
      maximumWindowMinutes: settings.maximumReminderWindowMinutes ?? 1440,
    },
  };
}

export class SettingsService {
  private readonly repository = new SettingsRepository();

  async get(actor: RequestActor): Promise<InstitutionSettings> {
    return serialize(await this.repository.find(actor));
  }

  async update(actor: RequestActor, input: UpdateSettingsInput): Promise<InstitutionSettings> {
    const previous = await this.get(actor);
    const persisted = {
      institutionName: input.institutionName ?? previous.institutionName,
      institutionType: input.institutionType ?? previous.institutionType,
      countryCode: input.countryCode ?? previous.countryCode,
      countryName: input.countryName ?? previous.countryName,
      primaryColor: input.primaryColor ?? previous.primaryColor,
      secondaryColor: input.secondaryColor ?? previous.secondaryColor,
      terminologyPreset: input.terminologyPreset ?? previous.terminologyPreset,
      terminologyOverrides:
        input.terminologyOverrides === undefined
          ? previous.terminologyOverrides
          : compactOverrides(input.terminologyOverrides),
      staffTitlePreference: input.staffTitlePreference ?? previous.staffTitlePreference,
      studentIdentifierLabel: input.studentIdentifierLabel ?? previous.studentIdentifierLabel,
      studentIdentifierExample: input.studentIdentifierExample ?? previous.studentIdentifierExample,
      studentIdentifierPattern: input.studentIdentifierPattern ?? previous.studentIdentifierPattern,
      studentIdentifierGuidance:
        input.studentIdentifierGuidance ?? previous.studentIdentifierGuidance,
      timeZone: input.timeZone ?? previous.timeZone,
      dateFormat: input.dateFormat ?? previous.dateFormat,
      attendanceRequirement: input.attendanceRequirement,
      qrRotationSeconds: input.qrRotationSeconds,
      gpsRadiusMetres: input.gpsRadiusMetres,
      lateArrivalMinutes: input.lateArrivalMinutes,
      academicSession: input.academicSession,
      currentSemester: input.currentSemester,
      electiveRegistrationRequiresApproval:
        input.electiveRegistrationRequiresApproval ?? previous.electiveRegistrationRequiresApproval,
      reminderPolicy: input.reminderPolicy ?? previous.reminderPolicy,
      ...(previous.logoUrl ? { logoUrl: previous.logoUrl } : {}),
    };
    const updated = serialize(await this.repository.update(actor, persisted));
    await auditService.record({
      action: 'institution.settings.updated',
      resourceType: 'institution_settings',
      resourceId: actor.universityId,
      actor,
      oldValue: previous,
      newValue: updated,
    });
    return updated;
  }

  async updateBranding(
    actor: RequestActor,
    input: UpdateInstitutionBrandingInput,
  ): Promise<InstitutionSettings> {
    const previous = await this.get(actor);
    if (input.logoAssetId && input.logoUrl)
      await mediaUploadService.assertInstitutionLogo(actor, input.logoAssetId, input.logoUrl);
    await this.repository.updateBranding(
      actor,
      input.logoAssetId && input.logoUrl
        ? { logoAssetId: input.logoAssetId, logoUrl: input.logoUrl }
        : null,
    );
    if (previous.logoAssetId && previous.logoAssetId !== input.logoAssetId)
      await mediaUploadService.retire(actor, previous.logoAssetId).catch(() => undefined);
    const updated = await this.get(actor);
    await auditService.record({
      action: 'institution.branding.updated',
      resourceType: 'institution_branding',
      resourceId: actor.universityId,
      actor,
      oldValue: { logoAssetId: previous.logoAssetId, logoUrl: previous.logoUrl },
      newValue: { logoAssetId: updated.logoAssetId, logoUrl: updated.logoUrl },
    });
    return updated;
  }
}

export const settingsService = new SettingsService();
