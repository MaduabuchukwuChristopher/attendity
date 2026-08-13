import { createHash } from 'node:crypto';
import type { Types } from 'mongoose';
import { AttendanceRecordModel } from '../models/attendance-record.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { CourseModel } from '../models/course.model.js';
import { CurriculumMappingModel } from '../models/curriculum-mapping.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { LecturerAssignmentModel } from '../models/lecturer-assignment.model.js';
import { LecturerProfileModel } from '../models/lecturer-profile.model.js';
import { StudentProfileModel } from '../models/student-profile.model.js';
import { UserModel } from '../models/user.model.js';
import { buildDemoDataset, type DemoDataset } from './demo-data.js';

const DEMO_LEVEL_CODES = ['100', '200', '300', '400'] as const;

function facultyCode(name: string): string {
  return `FAC-${createHash('sha1').update(name).digest('hex').slice(0, 8)}`;
}

function programmeLevelCode(programmeCode: string, levelCode: string): string {
  return `LVL-${levelCode}-${createHash('sha1').update(programmeCode).digest('hex').slice(0, 8)}`;
}

export function buildDemoHierarchyPlan(data: DemoDataset) {
  const faculties = [...new Set(data.departments.map((item) => item.faculty))].map((name) => ({
    code: facultyCode(name),
    name,
    parentCode: 'MAIN',
  }));
  const programmes = data.departments.map((department) => ({
    departmentCode: department.code,
    code: `PRG-${department.code}`,
    name: department.programme,
    parentCode: facultyCode(department.faculty),
  }));
  const levels = programmes.flatMap((programme) =>
    DEMO_LEVEL_CODES.map((levelCode) => ({
      departmentCode: programme.departmentCode,
      levelCode,
      code: programmeLevelCode(programme.code, levelCode),
      name: `${levelCode} Level`,
      parentCode: programme.code,
    })),
  );
  return { faculties, programmes, levels } as const;
}

export async function persistSemesterDemoData(input: {
  universityId: Types.ObjectId;
  administratorId: Types.ObjectId;
  passwordHash: string;
}) {
  const data = buildDemoDataset(20260809);
  const hierarchy = buildDemoHierarchyPlan(data);
  const termStartsAt = new Date('2026-04-20T00:00:00.000Z');
  const termEndsAt = new Date('2026-09-01T00:00:00.000Z');
  const audit = { universityId: input.universityId, createdBy: input.administratorId };
  const updatedBy = input.administratorId;
  await DepartmentModel.bulkWrite(
    data.departments.map((department) => ({
      updateOne: {
        filter: { universityId: input.universityId, code: department.code },
        update: {
          $set: {
            name: department.name,
            facultyName: department.faculty,
            status: 'active',
            updatedBy,
          },
          $setOnInsert: audit,
        },
        upsert: true,
      },
    })),
  );
  const departmentDocuments = await DepartmentModel.find({
    universityId: input.universityId,
    code: { $in: data.departments.map((item) => item.code) },
  }).exec();
  const departments = new Map(departmentDocuments.map((item) => [item.code, item]));

  async function structure(
    kind: 'campus' | 'faculty' | 'programme' | 'level' | 'academic_session' | 'term',
    code: string,
    name: string,
    extra: Record<string, unknown> = {},
  ) {
    return InstitutionStructureModel.findOneAndUpdate(
      { universityId: input.universityId, kind, code },
      { $set: { name, status: 'active', updatedBy, ...extra }, $setOnInsert: audit },
      { upsert: true, new: true },
    ).exec();
  }
  const campus = await structure('campus', 'MAIN', 'Main Campus');
  const facultyDocuments = new Map<string, Awaited<ReturnType<typeof structure>>>();
  for (const faculty of hierarchy.faculties)
    facultyDocuments.set(
      faculty.code,
      await structure('faculty', faculty.code, faculty.name, { parentId: campus._id }),
    );
  const programmes = new Map<string, Awaited<ReturnType<typeof structure>>>();
  for (const programme of hierarchy.programmes)
    programmes.set(
      programme.departmentCode,
      await structure('programme', programme.code, programme.name, {
        parentId: facultyDocuments.get(programme.parentCode)!._id,
      }),
    );
  const levels = new Map<string, Awaited<ReturnType<typeof structure>>>();
  for (const level of hierarchy.levels)
    levels.set(
      `${level.departmentCode}:${level.levelCode}`,
      await structure('level', level.code, level.name, {
        parentId: programmes.get(level.departmentCode)!._id,
      }),
    );
  const academicSession = await structure(
    'academic_session',
    '2026-2027',
    '2026/2027 Academic Session',
    { startsAt: termStartsAt, endsAt: termEndsAt, isCurrent: true },
  );
  const term = await structure('term', '2026-S1', 'First Semester', {
    parentId: academicSession._id,
    startsAt: termStartsAt,
    endsAt: termEndsAt,
    isCurrent: true,
  });

  const people = [
    ...data.lecturers.map((person) => ({ ...person, role: 'lecturer' as const })),
    ...data.students.map((person) => ({ ...person, role: 'student' as const })),
  ];
  await UserModel.bulkWrite(
    people.map((person) => ({
      updateOne: {
        filter: { universityId: input.universityId, email: person.email },
        update: {
          $set: {
            firstName: person.firstName,
            lastName: person.lastName,
            role: person.role,
            passwordHash: input.passwordHash,
            accountStatus: 'active',
            isVerified: true,
            campus: campus.name,
            facultyName: data.departments.find((item) => item.code === person.departmentCode)!
              .faculty,
            departmentId: departments.get(person.departmentCode)!._id,
            ...(person.role === 'student'
              ? {
                  matricNumber: person.matricNumber,
                  programme: data.departments.find((item) => item.code === person.departmentCode)!
                    .programme,
                  level: `${person.levelCode} Level`,
                }
              : {}),
            updatedBy,
          },
          $setOnInsert: audit,
        },
        upsert: true,
      },
    })),
  );
  const userDocuments = await UserModel.find({
    universityId: input.universityId,
    email: { $in: people.map((person) => person.email) },
  }).exec();
  const users = new Map(userDocuments.map((item) => [item.email, item]));

  await LecturerProfileModel.bulkWrite(
    data.lecturers.map((person, index) => ({
      updateOne: {
        filter: { universityId: input.universityId, userId: users.get(person.email)!._id },
        update: {
          $set: {
            employeeNumber: `ATD-LEC-${String(index + 1).padStart(3, '0')}`,
            title: index % 3 === 0 ? 'Professor' : 'Dr',
            campusId: campus._id,
            facultyId: facultyDocuments.get(
              facultyCode(
                data.departments.find((item) => item.code === person.departmentCode)!.faculty,
              ),
            )!._id,
            departmentId: departments.get(person.departmentCode)!._id,
            office: `Academic Wing ${1 + (index % 6)}, Office ${101 + index}`,
            biography: 'Fictional Attendity demonstration lecturer profile.',
            completedAt: new Date('2026-04-01T00:00:00.000Z'),
            updatedBy,
          },
          $setOnInsert: audit,
        },
        upsert: true,
      },
    })),
  );
  await StudentProfileModel.bulkWrite(
    data.students.map((person) => ({
      updateOne: {
        filter: { universityId: input.universityId, userId: users.get(person.email)!._id },
        update: {
          $set: {
            matricNumber: person.matricNumber,
            campusId: campus._id,
            facultyId: facultyDocuments.get(
              facultyCode(
                data.departments.find((item) => item.code === person.departmentCode)!.faculty,
              ),
            )!._id,
            departmentId: departments.get(person.departmentCode)!._id,
            programmeId: programmes.get(person.departmentCode)!._id,
            levelId: levels.get(`${person.departmentCode}:${person.levelCode}`)!._id,
            admissionSessionId: academicSession._id,
            completedAt: new Date('2026-04-01T00:00:00.000Z'),
            updatedBy,
          },
          $setOnInsert: audit,
        },
        upsert: true,
      },
    })),
  );

  await CourseModel.bulkWrite(
    data.courses.map((course) => ({
      updateOne: {
        filter: { universityId: input.universityId, code: course.code },
        update: {
          $set: {
            title: course.title,
            departmentId: departments.get(course.departmentCode)!._id,
            lecturerId: users.get(
              data.lecturers.find((item) => item.key === course.lecturerKey)!.email,
            )!._id,
            creditUnits: 3,
            attendanceRequirement: 75,
            status: 'active',
            updatedBy,
          },
          $setOnInsert: audit,
        },
        upsert: true,
      },
    })),
  );
  const courseDocuments = await CourseModel.find({
    universityId: input.universityId,
    code: { $in: data.courses.map((item) => item.code) },
  }).exec();
  const courses = new Map(courseDocuments.map((item) => [item.code, item]));
  const courseDefinition = new Map(data.courses.map((item) => [item.key, item]));
  await LecturerAssignmentModel.bulkWrite(
    data.courses.map((course) => ({
      updateOne: {
        filter: {
          universityId: input.universityId,
          lecturerId: users.get(
            data.lecturers.find((item) => item.key === course.lecturerKey)!.email,
          )!._id,
          courseId: courses.get(course.code)!._id,
          termId: term._id,
        },
        update: {
          $set: {
            academicSessionId: academicSession._id,
            assignmentRole: 'primary',
            startsAt: termStartsAt,
            endsAt: termEndsAt,
            status: 'active',
            updatedBy,
          },
          $setOnInsert: audit,
        },
        upsert: true,
      },
    })),
  );
  await CurriculumMappingModel.bulkWrite(
    data.courses.flatMap((course) =>
      DEMO_LEVEL_CODES.map((levelCode) => ({
        updateOne: {
          filter: {
            universityId: input.universityId,
            courseId: courses.get(course.code)!._id,
            programmeId: programmes.get(course.departmentCode)!._id,
            levelId: levels.get(`${course.departmentCode}:${levelCode}`)!._id,
            termId: term._id,
          },
          update: {
            $set: { classification: 'core', status: 'active', updatedBy },
            $setOnInsert: audit,
          },
          upsert: true,
        },
      })),
    ),
  );
  await CourseRegistrationModel.bulkWrite(
    data.students.flatMap((student) =>
      data.courses
        .filter((course) => course.departmentCode === student.departmentCode)
        .map((course) => ({
          updateOne: {
            filter: {
              universityId: input.universityId,
              studentId: users.get(student.email)!._id,
              courseId: courses.get(course.code)!._id,
            },
            update: {
              $set: {
                registrationNumber: `${student.matricNumber}-${course.code.replace(' ', '')}`,
                status: 'approved',
                source: 'core',
                reviewedBy: input.administratorId,
                reviewedAt: new Date('2026-04-10T00:00:00.000Z'),
                updatedBy,
              },
              $setOnInsert: audit,
            },
            upsert: true,
          },
        })),
    ),
  );

  await AttendanceSessionModel.bulkWrite(
    data.sessions.map((session) => {
      const course = courseDefinition.get(session.courseKey)!;
      const nonce = createHash('sha256')
        .update(`attendity-demo:${session.key}`)
        .digest('base64url');
      return {
        updateOne: {
          filter: {
            universityId: input.universityId,
            checkInCode: `ATD${createHash('sha1').update(session.key).digest('hex').slice(0, 10).toUpperCase()}`,
          },
          update: {
            $set: {
              contextType: 'CLASS_SESSION',
              courseId: courses.get(course.code)!._id,
              lecturerId: users.get(
                data.lecturers.find((item) => item.key === course.lecturerKey)!.email,
              )!._id,
              ownerId: users.get(
                data.lecturers.find((item) => item.key === course.lecturerKey)!.email,
              )!._id,
              openedAt: new Date(session.openedAt),
              closesAt: new Date(session.closesAt),
              closedAt: new Date(session.closesAt),
              status: 'closed',
              qrMode: 'rotating',
              qrRotationSeconds: 60,
              qrRotatedAt: new Date(session.openedAt),
              qrNonce: nonce,
              qrNonceHash: createHash('sha256').update(nonce).digest('hex'),
              gpsRequired: false,
              faceVerificationRequired: false,
              updatedBy,
            },
            $setOnInsert: audit,
          },
          upsert: true,
        },
      };
    }),
  );
  const sessionCodes = data.sessions.map(
    (session) =>
      `ATD${createHash('sha1').update(session.key).digest('hex').slice(0, 10).toUpperCase()}`,
  );
  const sessionDocuments = await AttendanceSessionModel.find({
    universityId: input.universityId,
    checkInCode: { $in: sessionCodes },
  })
    .select('+checkInCode')
    .exec();
  const sessions = new Map(sessionDocuments.map((item) => [item.checkInCode, item]));
  const studentByKey = new Map(data.students.map((item) => [item.key, item]));
  const sessionByKey = new Map(data.sessions.map((item) => [item.key, item]));
  const operations: Parameters<typeof AttendanceRecordModel.bulkWrite>[0] = data.attendance.map(
    (record) => {
      const student = studentByKey.get(record.studentKey)!;
      const sessionData = sessionByKey.get(record.sessionKey)!;
      const session = sessions.get(
        `ATD${createHash('sha1').update(record.sessionKey).digest('hex').slice(0, 10).toUpperCase()}`,
      )!;
      const course = courseDefinition.get(record.courseKey)!;
      return {
        updateOne: {
          filter: {
            universityId: input.universityId,
            sessionId: session._id,
            studentId: users.get(student.email)!._id,
          },
          update: {
            $set: {
              contextType: 'CLASS_SESSION',
              courseId: courses.get(course.code)!._id,
              checkedInAt: new Date(
                new Date(sessionData.openedAt).getTime() +
                  (record.status === 'late' ? 25 : 6) * 60_000,
              ),
              status: record.status,
              method: 'qr',
              verificationMethods: ['dynamic_qr'],
              verificationStatus: 'verified',
              qrVerified: true,
              updatedBy,
            },
            $setOnInsert: audit,
          },
          upsert: true,
        },
      };
    },
  );
  for (let start = 0; start < operations.length; start += 1000)
    await AttendanceRecordModel.bulkWrite(operations.slice(start, start + 1000));
  return {
    students: data.students.length,
    lecturers: data.lecturers.length,
    courses: data.courses.length,
    sessions: data.sessions.length,
    attendance: data.attendance.length,
  };
}
