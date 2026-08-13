import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canReadProfileOptions,
  validateStudentIdentifier,
} from '../src/services/profile.service.js';
import {
  updateLecturerProfileSchema,
  updateStudentProfileSchema,
} from '../src/validators/profile.validator.js';
import { updateSettingsSchema } from '../src/validators/settings.validator.js';

const objectId = '507f1f77bcf86cd799439011';

void describe('role-specific profile validation', () => {
  void it('accepts institution matriculation guidance and a bounded pattern', () => {
    const result = updateSettingsSchema.safeParse({
      body: {
        attendanceRequirement: 75,
        qrRotationSeconds: 60,
        gpsRadiusMetres: 100,
        lateArrivalMinutes: 15,
        academicSession: '2026/2027',
        currentSemester: 'First Semester',
        studentIdentifierExample: 'LMU/CSC/2026/001',
        studentIdentifierPattern: '^LMU/[A-Z]{3}/\\d{4}/\\d{3}$',
        studentIdentifierGuidance: 'Use the identifier issued by Registry.',
      },
    });

    assert.equal(result.success, true);
    assert.equal(
      validateStudentIdentifier('lmu/csc/2026/001', '^LMU/[A-Z]{3}/\\d{4}/\\d{3}$'),
      true,
    );
    assert.equal(validateStudentIdentifier('LMU-001', '^LMU/[A-Z]{3}/\\d{4}/\\d{3}$'), false);
  });

  void it('rejects invalid or unsafe matriculation patterns', () => {
    for (const pattern of ['[', 'a'.repeat(201)]) {
      const result = updateSettingsSchema.safeParse({
        body: {
          attendanceRequirement: 75,
          qrRotationSeconds: 60,
          gpsRadiusMetres: 100,
          lateArrivalMinutes: 15,
          academicSession: '2026/2027',
          currentSemester: 'First Semester',
          studentIdentifierPattern: pattern,
        },
      });
      assert.equal(result.success, false);
    }
  });

  void it('requires the complete academic hierarchy for student profiles', () => {
    const result = updateStudentProfileSchema.safeParse({
      body: {
        matricNumber: 'LMU/CSC/2026/001',
        phone: '+2348012345678',
        campusId: objectId,
        facultyId: objectId,
        departmentId: objectId,
        programmeId: objectId,
        levelId: objectId,
        admissionSessionId: objectId,
      },
    });
    assert.equal(result.success, true);
    assert.equal(
      updateStudentProfileSchema.safeParse({ body: { matricNumber: 'LMU/CSC/2026/001' } }).success,
      false,
    );
  });

  void it('requires profile photo URLs to be paired with a secure asset identifier', () => {
    const base = {
      matricNumber: 'UNI/CSC/2026/001',
      phone: '+234 800 000 0000',
      campusId: '507f1f77bcf86cd799439011',
      facultyId: '507f1f77bcf86cd799439012',
      departmentId: '507f1f77bcf86cd799439013',
      programmeId: '507f1f77bcf86cd799439014',
      levelId: '507f1f77bcf86cd799439015',
      admissionSessionId: '507f1f77bcf86cd799439016',
    };
    assert.equal(
      updateStudentProfileSchema.safeParse({
        body: { ...base, photoUrl: 'https://res.cloudinary.com/demo/image/upload/photo.webp' },
      }).success,
      false,
    );
    assert.equal(
      updateStudentProfileSchema.safeParse({
        body: {
          ...base,
          photoAssetId: '507f1f77bcf86cd799439017',
          photoUrl: 'https://res.cloudinary.com/demo/image/upload/photo.webp',
        },
      }).success,
      true,
    );
  });

  void it('accepts lecturer professional details without allowing course self-assignment', () => {
    const result = updateLecturerProfileSchema.safeParse({
      body: {
        employeeNumber: 'LMU-STF-0042',
        title: 'Dr',
        phone: '+2348012345678',
        departmentId: objectId,
        biography: 'Lecturer in distributed systems and software engineering.',
      },
    });
    assert.equal(result.success, true);
    assert.equal(
      updateLecturerProfileSchema.safeParse({
        body: { employeeNumber: 'LMU-STF-0042', courseIds: [objectId] },
      }).success,
      false,
    );
  });

  void it('exposes profile option data only to student and lecturer self-service roles', () => {
    assert.equal(canReadProfileOptions('student'), true);
    assert.equal(canReadProfileOptions('lecturer'), true);
    assert.equal(canReadProfileOptions('examiner'), false);
    assert.equal(canReadProfileOptions('university_admin'), false);
  });
});
