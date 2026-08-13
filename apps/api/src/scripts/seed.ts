import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { environment } from '../config/environment.js';
import { connectDatabase, disconnectDatabase } from '../database/mongodb.js';
import { AttendanceRecordModel } from '../models/attendance-record.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { CourseModel } from '../models/course.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { ClassScheduleModel } from '../models/class-schedule.model.js';
import { ReminderPreferenceModel } from '../models/reminder-preference.model.js';
import { UniversityModel } from '../models/university.model.js';
import { UserModel } from '../models/user.model.js';
import { logger } from '../config/logger.js';
import { reminderService } from '../services/reminder.service.js';
import { announcementService } from '../services/announcement.service.js';
import { AnnouncementModel } from '../models/announcement.model.js';
import { EventModel } from '../models/event.model.js';
import { eventService } from '../services/event.service.js';
import { ROLE_PERMISSIONS } from '@qr/shared';
import { persistSemesterDemoData } from './persist-demo-data.js';

if (process.env.ALLOW_DEMO_SEED !== 'true')
  throw new Error('Set ALLOW_DEMO_SEED=true to confirm creation of demonstration records.');
const configuredSeedPassword = process.env.SEED_ACCOUNT_PASSWORD;
if (!configuredSeedPassword || configuredSeedPassword.length < 16)
  throw new Error('SEED_ACCOUNT_PASSWORD must contain at least 16 characters.');
const seedPassword: string = configuredSeedPassword;

async function seed(): Promise<void> {
  await connectDatabase();
  const university = await UniversityModel.findOneAndUpdate(
    { slug: 'lagos-metropolitan-university' },
    {
      $set: {
        name: 'Lagos Metropolitan University',
        email: 'registry@lmu.edu.ng',
        institutionType: 'university',
        countryCode: 'NG',
        countryName: 'Nigeria',
        primaryColor: '#14532D',
        secondaryColor: '#B8892D',
        status: 'active',
      },
      $setOnInsert: { slug: 'lagos-metropolitan-university' },
    },
    { upsert: true, new: true },
  ).exec();
  const universityId = university._id;
  const passwordHash = await bcrypt.hash(seedPassword, environment.BCRYPT_ROUNDS);
  const people = [
    ['Chidinma', 'Okeke', 'admin@lmu.edu.ng', 'university_admin', undefined],
    ['Tunde', 'Adebayo', 'examiner@lmu.edu.ng', 'examiner', undefined],
    ['Nneka', 'Eze', 'nneka.eze@lmu.edu.ng', 'lecturer', undefined],
    ['Ibrahim', 'Musa', 'ibrahim.musa@lmu.edu.ng', 'lecturer', undefined],
    ['Amina', 'Bello', 'amina.bello@student.lmu.edu.ng', 'student', 'LMU/CSC/2026/001'],
    ['Chukwudi', 'Nwosu', 'chukwudi.nwosu@student.lmu.edu.ng', 'student', 'LMU/CSC/2026/002'],
    ['Temilade', 'Adeyemi', 'temilade.adeyemi@student.lmu.edu.ng', 'student', 'LMU/CSC/2026/003'],
    ['Efe', 'Oghene', 'efe.oghene@student.lmu.edu.ng', 'student', 'LMU/ECO/2026/004'],
  ] as const;
  const users = new Map<string, InstanceType<typeof UserModel>>();
  for (const [firstName, lastName, email, role, matricNumber] of people) {
    const user = await UserModel.findOneAndUpdate(
      { universityId, email },
      {
        $set: {
          firstName,
          lastName,
          role,
          passwordHash,
          accountStatus: 'active',
          isVerified: true,
          ...(matricNumber
            ? {
                matricNumber,
                programme: role === 'student' ? 'Bachelor of Science' : undefined,
                level: '400 Level',
              }
            : {}),
        },
        $setOnInsert: { universityId },
      },
      { upsert: true, new: true },
    ).exec();
    users.set(email, user);
  }
  const admin = users.get('admin@lmu.edu.ng');
  if (!admin) throw new Error('Seed administrator was not created.');

  const departmentDefinitions = [
    ['CSC', 'Computer Science', 'Faculty of Science'],
    ['MTH', 'Mathematics', 'Faculty of Science'],
    ['ECO', 'Economics', 'Faculty of Social Sciences'],
    ['LAW', 'Public and International Law', 'Faculty of Law'],
  ] as const;
  const departments = new Map<string, InstanceType<typeof DepartmentModel>>();
  for (const [code, name, facultyName] of departmentDefinitions) {
    const department = await DepartmentModel.findOneAndUpdate(
      { universityId, code },
      {
        $set: { name, facultyName, status: 'active', updatedBy: admin._id },
        $setOnInsert: { universityId, code, createdBy: admin._id },
      },
      { upsert: true, new: true },
    ).exec();
    departments.set(code, department);
  }
  const computerScienceDepartment = departments.get('CSC');
  const economicsDepartment = departments.get('ECO');
  if (!computerScienceDepartment || !economicsDepartment)
    throw new Error('Seed audience departments were not created.');
  await Promise.all([
    UserModel.updateMany(
      {
        universityId,
        email: {
          $in: [
            'nneka.eze@lmu.edu.ng',
            'ibrahim.musa@lmu.edu.ng',
            'amina.bello@student.lmu.edu.ng',
            'chukwudi.nwosu@student.lmu.edu.ng',
            'temilade.adeyemi@student.lmu.edu.ng',
          ],
        },
      },
      {
        $set: {
          campus: 'Main Campus',
          facultyName: 'Faculty of Science',
          departmentId: computerScienceDepartment._id,
          updatedBy: admin._id,
        },
      },
    ).exec(),
    UserModel.updateOne(
      { universityId, email: 'efe.oghene@student.lmu.edu.ng' },
      {
        $set: {
          campus: 'Main Campus',
          facultyName: 'Faculty of Social Sciences',
          departmentId: economicsDepartment._id,
          updatedBy: admin._id,
        },
      },
    ).exec(),
  ]);

  const lecturerOne = users.get('nneka.eze@lmu.edu.ng');
  const lecturerTwo = users.get('ibrahim.musa@lmu.edu.ng');
  if (!lecturerOne || !lecturerTwo) throw new Error('Seed lecturers were not created.');
  const courseDefinitions = [
    ['CSC 401', 'Software Engineering', 'CSC', lecturerOne._id],
    ['CSC 403', 'Distributed Systems', 'CSC', lecturerTwo._id],
    ['MTH 405', 'Numerical Analysis', 'MTH', lecturerTwo._id],
    ['ECO 411', 'Development Economics', 'ECO', lecturerOne._id],
  ] as const;
  const courses = new Map<string, InstanceType<typeof CourseModel>>();
  for (const [code, title, departmentCode, lecturerId] of courseDefinitions) {
    const department = departments.get(departmentCode);
    if (!department) throw new Error(`Department ${departmentCode} was not created.`);
    const course = await CourseModel.findOneAndUpdate(
      { universityId, code },
      {
        $set: {
          title,
          departmentId: department._id,
          lecturerId,
          creditUnits: 3,
          attendanceRequirement: 75,
          status: 'active',
          updatedBy: admin._id,
        },
        $setOnInsert: { universityId, code, createdBy: admin._id },
      },
      { upsert: true, new: true },
    ).exec();
    courses.set(code, course);
  }

  const students = [...users.values()].filter((user) => user.role === 'student');
  for (const student of students) {
    for (const course of [...courses.values()].slice(0, 3)) {
      await CourseRegistrationModel.findOneAndUpdate(
        { universityId, studentId: student._id, courseId: course._id },
        {
          $set: { status: 'approved', updatedBy: admin._id },
          $setOnInsert: {
            universityId,
            studentId: student._id,
            courseId: course._id,
            registrationNumber: `${student.matricNumber}-${course.code.replace(' ', '')}`,
            createdBy: admin._id,
          },
        },
        { upsert: true, new: true },
      ).exec();
    }
  }

  const referenceDate = new Date('2026-07-27T09:00:00.000Z');
  for (const [courseIndex, course] of [...courses.values()].entries()) {
    for (let sessionIndex = 0; sessionIndex < 6; sessionIndex += 1) {
      const openedAt = new Date(
        referenceDate.getTime() - (sessionIndex + courseIndex * 7) * 7 * 86_400_000,
      );
      const closesAt = new Date(openedAt.getTime() + 60 * 60_000);
      const checkInCode = `LMU${courseIndex}${sessionIndex}2026`;
      const nonce = randomBytes(24).toString('base64url');
      const session = await AttendanceSessionModel.findOneAndUpdate(
        { universityId, checkInCode },
        {
          $set: {
            contextType: 'CLASS_SESSION',
            courseId: course._id,
            lecturerId: course.lecturerId,
            ownerId: course.lecturerId,
            openedAt,
            closesAt,
            closedAt: closesAt,
            status: 'closed',
            qrMode: 'rotating',
            qrRotationSeconds: 60,
            qrRotatedAt: openedAt,
            qrNonce: nonce,
            qrNonceHash: createHash('sha256').update(nonce).digest('hex'),
            gpsRequired: false,
            faceVerificationRequired: false,
            updatedBy: admin._id,
          },
          $setOnInsert: { universityId, checkInCode, createdBy: admin._id },
        },
        { upsert: true, new: true },
      )
        .select('+checkInCode')
        .exec();
      for (const [studentIndex, student] of students.entries()) {
        if ((studentIndex + sessionIndex + courseIndex) % 5 === 0) continue;
        await AttendanceRecordModel.findOneAndUpdate(
          { universityId, sessionId: session._id, studentId: student._id },
          {
            $set: {
              contextType: 'CLASS_SESSION',
              courseId: course._id,
              checkedInAt: new Date(openedAt.getTime() + (8 + studentIndex) * 60_000),
              status: 'present',
              method: 'qr',
              verificationStatus: 'verified',
              qrVerified: true,
              updatedBy: admin._id,
            },
            $setOnInsert: {
              universityId,
              sessionId: session._id,
              studentId: student._id,
              createdBy: admin._id,
            },
          },
          { upsert: true },
        ).exec();
      }
    }
  }
  await SystemSettingsModel.findOneAndUpdate(
    { universityId },
    {
      $set: {
        attendanceRequirement: 75,
        qrRotationSeconds: 60,
        gpsRadiusMetres: 100,
        lateArrivalMinutes: 15,
        brandingName: 'Lagos Metropolitan University Attendity',
        terminologyPreset: 'university',
        terminologyOverrides: {},
        staffTitlePreference: 'Lecturer',
        studentIdentifierLabel: 'Matriculation number',
        timeZone: 'Africa/Lagos',
        dateFormat: 'DD/MM/YYYY',
        academicSession: '2026/2027',
        currentSemester: 'First Semester',
        reminderAllowedChannels: { inApp: true, email: true, push: true, sms: false },
        maximumReminderWindowMinutes: 1440,
        updatedBy: admin._id,
      },
      $setOnInsert: { universityId, createdBy: admin._id },
    },
    { upsert: true },
  ).exec();
  const seededSchedules = [];
  for (const [index, course] of [...courses.values()].entries()) {
    const venue = `Academic Block ${String.fromCharCode(65 + index)}${101 + index}`;
    const startsAt = new Date(Date.now() + (index + 1) * 24 * 60 * 60_000);
    startsAt.setUTCHours(9 + index, 0, 0, 0);
    const schedule = await ClassScheduleModel.findOneAndUpdate(
      { universityId, courseId: course._id, venue },
      {
        $set: {
          lecturerId: course.lecturerId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 90 * 60_000),
          venue,
          timeZone: 'Africa/Lagos',
          status: 'scheduled',
          revision: 1,
          updatedBy: admin._id,
        },
        $setOnInsert: { universityId, courseId: course._id, createdBy: admin._id },
      },
      { upsert: true, new: true },
    ).exec();
    seededSchedules.push(schedule);
  }
  for (const user of [lecturerOne, ...students]) {
    await ReminderPreferenceModel.findOneAndUpdate(
      { universityId, userId: user._id },
      {
        $set: {
          enabled: true,
          defaultOffsetMinutes: 30,
          channels: ['in_app'],
          preferredTimeZone: 'Africa/Lagos',
          quietHours: { enabled: true, startMinute: 1320, endMinute: 420 },
          mutedCourseIds: [],
          overrides: [],
          updatedBy: user._id,
        },
        $setOnInsert: { universityId, userId: user._id, createdBy: user._id },
      },
      { upsert: true },
    ).exec();
  }
  for (const schedule of seededSchedules) await reminderService.reconcileSchedule(schedule.id);
  let demonstrationAnnouncement = await AnnouncementModel.findOne({
    universityId,
    title: 'Welcome to the 2026/2027 academic session',
  }).exec();
  const adminActor = {
    id: String(admin._id),
    universityId: String(universityId),
    email: admin.email,
    fullName: `${admin.firstName} ${admin.lastName}`,
    role: 'university_admin' as const,
    sessionId: 'demonstration-seed',
    permissions: ROLE_PERMISSIONS.university_admin,
  };
  if (!demonstrationAnnouncement) {
    const created = await announcementService.create(adminActor, {
      title: 'Welcome to the 2026/2027 academic session',
      message:
        'Attend every scheduled learning activity, review your academic timetable, and keep your attendance record ready for examination clearance.',
      category: 'academic',
      priority: 'normal',
      audience: { roles: ['student', 'lecturer'] },
      attachments: [],
      pinned: true,
      acknowledgementRequired: true,
      channels: ['in_app'],
    });
    demonstrationAnnouncement = await AnnouncementModel.findById(created.id).exec();
  }
  if (demonstrationAnnouncement?.status === 'draft')
    await announcementService.publish(adminActor, String(demonstrationAnnouncement._id));
  let demonstrationEvent = await EventModel.findOne({
    universityId,
    title: 'Attendity Academic Success Orientation',
  }).exec();
  if (!demonstrationEvent) {
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60_000);
    startsAt.setUTCHours(9, 0, 0, 0);
    const created = await eventService.create(adminActor, {
      title: 'Attendity Academic Success Orientation',
      description:
        'A mandatory orientation on consistent participation, verified attendance, academic support, and preparing for a successful semester.',
      eventType: 'orientation',
      campus: 'Main Campus',
      venue: 'University Multipurpose Hall',
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 2 * 60 * 60_000).toISOString(),
      timeZone: 'Africa/Lagos',
      capacity: 2000,
      registrationRequired: false,
      mandatory: true,
      audience: { campus: 'Main Campus', roles: ['student'] },
      reminderOffsetsMinutes: [1440, 60],
      notificationChannels: ['in_app'],
      postEventMessage: 'Thank you for investing in consistent academic participation.',
      participantReportAvailable: true,
      attendanceMethods: ['dynamic_qr', 'manual', 'pin'],
      qrRotationSeconds: 60,
      faceVerificationRequired: false,
      manualAttendanceAllowed: true,
      pinAttendanceAllowed: true,
      attendancePin: '294681',
      attachments: [],
    });
    demonstrationEvent = await EventModel.findById(created.id).exec();
  }
  if (demonstrationEvent?.status === 'draft')
    await eventService.publish(adminActor, String(demonstrationEvent._id));
  const semesterDemo = await persistSemesterDemoData({
    universityId,
    administratorId: admin._id,
    passwordHash,
  });
  logger.info(
    {
      universityId: universityId.toString(),
      users: users.size,
      courses: courses.size,
      semesterDemo,
    },
    'Demonstration data seeded',
  );
}

void seed()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Demonstration seed failed');
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
