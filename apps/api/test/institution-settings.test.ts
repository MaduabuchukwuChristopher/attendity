import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getInstitutionTerminology, INSTITUTION_TYPES } from '@qr/shared';
import { SystemSettingsModel } from '../src/models/system-settings.model.js';
import { UniversityModel } from '../src/models/university.model.js';
import { updateSettingsSchema } from '../src/validators/settings.validator.js';

const validLegacySettings = {
  attendanceRequirement: 75,
  qrRotationSeconds: 60,
  gpsRadiusMetres: 100,
  lateArrivalMinutes: 15,
  brandingName: 'Existing Attendity tenant',
  academicSession: '2026/2027',
  currentSemester: 'First Semester',
};

void describe('institution configuration', () => {
  void it('provides terminology for every supported institution type', () => {
    for (const institutionType of INSTITUTION_TYPES) {
      const terminology = getInstitutionTerminology(institutionType);
      assert.ok(terminology.institution.length > 0);
      assert.ok(terminology.coursePlural.length > 0);
      assert.ok(terminology.educatorPlural.length > 0);
    }
    assert.equal(getInstitutionTerminology('polytechnic').primaryUnit, 'School');
    assert.equal(getInstitutionTerminology('technical_college').educator, 'Instructor');
    assert.equal(getInstitutionTerminology('military_paramilitary_academy').student, 'Cadet');
  });

  void it('applies validated custom terminology without mutating a preset', () => {
    const first = getInstitutionTerminology('institute', { educator: 'Mentor' });
    const second = getInstitutionTerminology('institute');
    assert.equal(first.educator, 'Mentor');
    assert.equal(first.course, 'Programme');
    assert.equal(second.educator, 'Facilitator');
  });

  void it('accepts the legacy settings payload for backward compatibility', () => {
    const result = updateSettingsSchema.safeParse({ body: validLegacySettings });
    assert.equal(result.success, true);
  });

  void it('accepts the current settings form without the legacy branding field', () => {
    const currentFormSettings = Object.fromEntries(
      Object.entries(validLegacySettings).filter(([key]) => key !== 'brandingName'),
    );
    const result = updateSettingsSchema.safeParse({ body: currentFormSettings });
    assert.equal(result.success, true);
  });

  void it('normalizes and validates global institution configuration', () => {
    const result = updateSettingsSchema.safeParse({
      body: {
        ...validLegacySettings,
        institutionName: 'Accra Technical Institute',
        institutionType: 'technical_college',
        countryCode: 'gh',
        countryName: 'Ghana',
        primaryColor: '#14532D',
        secondaryColor: '#B8892D',
        terminologyPreset: 'custom',
        terminologyOverrides: { educator: 'Trainer', course: 'Trade' },
        staffTitlePreference: 'Lead Instructor',
        studentIdentifierLabel: 'Trainee number',
        timeZone: 'Africa/Accra',
        dateFormat: 'DD/MM/YYYY',
      },
    });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.body.countryCode, 'GH');
  });

  void it('rejects malformed colours and unsupported time zones', () => {
    const result = updateSettingsSchema.safeParse({
      body: {
        ...validLegacySettings,
        primaryColor: 'green',
        timeZone: 'Africa/Not-A-Real-Time-Zone',
      },
    });
    assert.equal(result.success, false);
  });

  void it('supplies compatibility defaults for existing university records', () => {
    const institution = new UniversityModel({
      name: 'Existing University',
      slug: 'existing-university',
      email: 'registry@example.edu',
    });
    const settings = new SystemSettingsModel({
      universityId: institution._id,
    });
    assert.equal(institution.institutionType, 'university');
    assert.equal(institution.countryCode, 'NG');
    assert.equal(institution.primaryColor, '#14532D');
    assert.equal(settings.terminologyPreset, 'university');
    assert.equal(settings.timeZone, 'Africa/Lagos');
    assert.equal(settings.dateFormat, 'DD/MM/YYYY');
  });
});
