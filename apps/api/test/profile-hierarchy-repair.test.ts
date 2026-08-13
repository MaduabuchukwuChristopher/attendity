import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/database/mongodb.js';
import { CurriculumMappingModel } from '../src/models/curriculum-mapping.model.js';
import { InstitutionStructureModel } from '../src/models/institution-structure.model.js';
import { StudentProfileModel } from '../src/models/student-profile.model.js';
import { repairProfileHierarchy } from '../src/scripts/repair-profile-hierarchy.js';

const tenantA = new mongoose.Types.ObjectId();
const tenantB = new mongoose.Types.ObjectId();

void describe('profile hierarchy repair', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    await Promise.all([
      InstitutionStructureModel.collection.deleteMany({
        universityId: { $in: [tenantA, tenantB] },
      }),
      StudentProfileModel.collection.deleteMany({ universityId: { $in: [tenantA, tenantB] } }),
      CurriculumMappingModel.collection.deleteMany({ universityId: { $in: [tenantA, tenantB] } }),
    ]);
    await disconnectDatabase();
  });

  void it('repairs one tenant idempotently without changing another tenant', async () => {
    const campusId = new mongoose.Types.ObjectId();
    const facultyId = new mongoose.Types.ObjectId();
    const programmeId = new mongoose.Types.ObjectId();
    const legacyLevelId = new mongoose.Types.ObjectId();
    const sentinelId = new mongoose.Types.ObjectId();
    const now = new Date();
    await InstitutionStructureModel.collection.insertMany([
      {
        _id: campusId,
        universityId: tenantA,
        kind: 'campus',
        code: 'MAIN',
        name: 'Main Campus',
        status: 'active',
        isCurrent: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: facultyId,
        universityId: tenantA,
        kind: 'faculty',
        code: 'FAC-SCI',
        name: 'Science',
        status: 'active',
        isCurrent: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: programmeId,
        universityId: tenantA,
        kind: 'programme',
        code: 'PRG-CSC',
        name: 'Computer Science',
        parentId: facultyId,
        status: 'active',
        isCurrent: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: legacyLevelId,
        universityId: tenantA,
        kind: 'level',
        code: 'L100',
        name: '100 Level',
        status: 'active',
        isCurrent: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: sentinelId,
        universityId: tenantB,
        kind: 'faculty',
        code: 'FAC-LAW',
        name: 'Law',
        status: 'active',
        isCurrent: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const studentId = new mongoose.Types.ObjectId();
    await StudentProfileModel.collection.insertOne({
      _id: studentId,
      universityId: tenantA,
      userId: new mongoose.Types.ObjectId(),
      matricNumber: 'ATD/CSC/001',
      campusId,
      facultyId,
      departmentId: new mongoose.Types.ObjectId(),
      programmeId,
      levelId: legacyLevelId,
      admissionSessionId: new mongoose.Types.ObjectId(),
      createdAt: now,
      updatedAt: now,
    });
    const mappingId = new mongoose.Types.ObjectId();
    await CurriculumMappingModel.collection.insertOne({
      _id: mappingId,
      universityId: tenantA,
      courseId: new mongoose.Types.ObjectId(),
      programmeId,
      levelId: legacyLevelId,
      termId: new mongoose.Types.ObjectId(),
      classification: 'core',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    const sentinelCount = await InstitutionStructureModel.collection.countDocuments({
      universityId: tenantB,
    });

    const firstRun = await repairProfileHierarchy(String(tenantA));

    const repairedFaculty = await InstitutionStructureModel.collection.findOne({ _id: facultyId });
    const repairedLevel = await InstitutionStructureModel.collection.findOne({
      universityId: tenantA,
      kind: 'level',
      parentId: programmeId,
    });
    const repairedStudent = await StudentProfileModel.collection.findOne({ _id: studentId });
    const repairedMapping = await CurriculumMappingModel.collection.findOne({ _id: mappingId });
    assert.equal(String(repairedFaculty?.parentId), String(campusId));
    assert.ok(repairedLevel);
    assert.notEqual(String(repairedLevel._id), String(legacyLevelId));
    assert.equal(String(repairedStudent?.levelId), String(repairedLevel._id));
    assert.equal(String(repairedMapping?.levelId), String(repairedLevel._id));
    assert.deepEqual(firstRun, {
      facultiesLinked: 1,
      levelsCreated: 1,
      studentProfilesUpdated: 1,
      curriculumMappingsUpdated: 1,
      ambiguousInstitutions: 0,
    });

    const secondRun = await repairProfileHierarchy(String(tenantA));

    assert.deepEqual(secondRun, {
      facultiesLinked: 0,
      levelsCreated: 0,
      studentProfilesUpdated: 0,
      curriculumMappingsUpdated: 0,
      ambiguousInstitutions: 0,
    });
    assert.equal(
      await InstitutionStructureModel.collection.countDocuments({ universityId: tenantB }),
      sentinelCount,
    );
  });
});
