import type { ClassSchedulePage, ClassScheduleSummary, RequestActor } from '@qr/types';
import { ClassScheduleModel } from '../models/class-schedule.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { CourseModel } from '../models/course.model.js';
import { UserModel } from '../models/user.model.js';
import { socketService } from '../socket/socket.service.js';
import type { CreateScheduleInput, UpdateScheduleInput } from '../validators/schedule.validator.js';
import { auditService } from './audit.service.js';
import { reminderService } from './reminder.service.js';
import { lecturerAssignmentService } from './lecturer-assignment.service.js';

function id(value: unknown): string {
  return String(value);
}

function view(row: Record<string, unknown>): ClassScheduleSummary {
  const course = row.courseId as { _id?: unknown; code?: string; title?: string };
  const lecturer = row.lecturerId as {
    _id?: unknown;
    firstName?: string;
    lastName?: string;
  };
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date();
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : createdAt;
  return {
    id: id(row._id),
    courseId: id(course?._id ?? row.courseId),
    courseCode: course?.code ?? 'Course',
    courseTitle: course?.title ?? 'Scheduled class',
    lecturerId: id(lecturer?._id ?? row.lecturerId),
    lecturerName:
      [lecturer?.firstName, lecturer?.lastName].filter(Boolean).join(' ') || 'Assigned educator',
    startsAt: (row.startsAt as Date).toISOString(),
    endsAt: (row.endsAt as Date).toISOString(),
    venue: String(row.venue),
    timeZone: String(row.timeZone),
    status: row.status as ClassScheduleSummary['status'],
    revision: Number(row.revision),
    ...(typeof row.cancellationReason === 'string'
      ? { cancellationReason: row.cancellationReason }
      : {}),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export class ScheduleService {
  private async permittedCourseIds(actor: RequestActor): Promise<readonly string[] | undefined> {
    if (actor.role === 'lecturer') {
      return lecturerAssignmentService.activeCourseIds(actor, new Date());
    }
    if (actor.role === 'student') {
      const registrations = await CourseRegistrationModel.find({
        universityId: actor.universityId,
        studentId: actor.id,
        status: 'approved',
      })
        .select('courseId')
        .lean()
        .exec();
      return registrations.map((registration) => id(registration.courseId));
    }
    return actor.permissions.includes('courses:read') ? undefined : [];
  }

  async list(
    actor: RequestActor,
    input: {
      readonly status: 'scheduled' | 'cancelled' | 'completed' | 'all';
      readonly from?: string | undefined;
      readonly to?: string | undefined;
      readonly page: number;
      readonly limit: number;
    },
  ): Promise<ClassSchedulePage> {
    const courseIds = await this.permittedCourseIds(actor);
    const filter: Record<string, unknown> = {
      universityId: actor.universityId,
      ...(courseIds ? { courseId: { $in: courseIds } } : {}),
      ...(input.status === 'all' ? {} : { status: input.status }),
    };
    if (input.from || input.to)
      filter.startsAt = {
        ...(input.from ? { $gte: new Date(input.from) } : {}),
        ...(input.to ? { $lte: new Date(input.to) } : {}),
      };
    const [rows, total] = await Promise.all([
      ClassScheduleModel.find(filter)
        .populate('courseId', 'code title')
        .populate('lecturerId', 'firstName lastName')
        .sort({ startsAt: 1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      ClassScheduleModel.countDocuments(filter),
    ]);
    return {
      items: rows.map((row) => view(row as unknown as Record<string, unknown>)),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  private async source(
    actor: RequestActor,
    courseId: string,
    lecturerId?: string,
    at = new Date(),
  ) {
    const course = await CourseModel.findOne({
      _id: courseId,
      universityId: actor.universityId,
      status: 'active',
    }).exec();
    if (!course)
      throw Object.assign(new Error('Active course was not found in this institution.'), {
        statusCode: 422,
      });
    const targetLecturerId =
      lecturerId ??
      (actor.role === 'lecturer'
        ? actor.id
        : course.lecturerId
          ? id(course.lecturerId)
          : undefined);
    if (!targetLecturerId)
      throw Object.assign(new Error('Assign an active educator before scheduling this course.'), {
        statusCode: 422,
      });
    if (actor.role === 'lecturer') {
      if (targetLecturerId !== actor.id)
        throw Object.assign(new Error('You cannot schedule a class for another lecturer.'), {
          statusCode: 403,
        });
      await lecturerAssignmentService.assertActiveAssignment(actor, courseId, at);
    }
    if (!actor.permissions.includes('courses:write') && actor.role !== 'lecturer')
      throw Object.assign(new Error('You cannot manage class schedules.'), { statusCode: 403 });
    const lecturer = await UserModel.exists({
      _id: targetLecturerId,
      universityId: actor.universityId,
      role: 'lecturer',
      accountStatus: 'active',
    });
    if (!lecturer)
      throw Object.assign(new Error('Active educator was not found in this institution.'), {
        statusCode: 422,
      });
    return { course, lecturerId: targetLecturerId };
  }

  async create(actor: RequestActor, input: CreateScheduleInput): Promise<ClassScheduleSummary> {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (startsAt <= new Date())
      throw Object.assign(new Error('A new class schedule must begin in the future.'), {
        statusCode: 422,
      });
    const { lecturerId } = await this.source(actor, input.courseId, input.lecturerId, startsAt);
    const schedule = await ClassScheduleModel.create({
      courseId: input.courseId,
      lecturerId,
      startsAt,
      endsAt,
      venue: input.venue,
      timeZone: input.timeZone,
      status: 'scheduled',
      revision: 1,
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'class_schedule.created',
      resourceType: 'class_schedule',
      resourceId: schedule.id,
      actor,
      newValue: schedule.toJSON(),
    });
    await reminderService.reconcileSchedule(schedule.id);
    socketService.emitToUniversity(actor.universityId, 'class-schedule:created', {
      scheduleId: schedule.id,
    });
    const created = await this.findView(actor.universityId, schedule.id);
    return created;
  }

  private async manageable(actor: RequestActor, scheduleId: string) {
    const schedule = await ClassScheduleModel.findOne({
      _id: scheduleId,
      universityId: actor.universityId,
    }).exec();
    if (!schedule)
      throw Object.assign(new Error('Class schedule was not found.'), { statusCode: 404 });
    if (actor.role === 'lecturer' && id(schedule.lecturerId) !== actor.id)
      throw Object.assign(new Error('This class schedule is outside your assigned courses.'), {
        statusCode: 403,
      });
    if (!actor.permissions.includes('courses:write') && actor.role !== 'lecturer')
      throw Object.assign(new Error('You cannot manage class schedules.'), { statusCode: 403 });
    if (schedule.status !== 'scheduled')
      throw Object.assign(new Error('Only scheduled classes can be changed.'), { statusCode: 409 });
    return schedule;
  }

  async update(
    actor: RequestActor,
    scheduleId: string,
    input: UpdateScheduleInput,
  ): Promise<ClassScheduleSummary> {
    const schedule = await this.manageable(actor, scheduleId);
    const previous = schedule.toJSON();
    const nextCourseId = id(schedule.courseId);
    const { lecturerId } = await this.source(
      actor,
      nextCourseId,
      input.lecturerId ?? id(schedule.lecturerId),
      input.startsAt ? new Date(input.startsAt) : schedule.startsAt,
    );
    const startsAt = input.startsAt ? new Date(input.startsAt) : schedule.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : schedule.endsAt;
    if (startsAt <= new Date() || endsAt <= startsAt)
      throw Object.assign(new Error('Updated class times must define a future valid window.'), {
        statusCode: 422,
      });
    schedule.set({
      ...input,
      lecturerId,
      startsAt,
      endsAt,
      revision: schedule.revision + 1,
      updatedBy: actor.id,
    });
    await schedule.save();
    await auditService.record({
      action: 'class_schedule.updated',
      resourceType: 'class_schedule',
      resourceId: schedule.id,
      actor,
      oldValue: previous,
      newValue: schedule.toJSON(),
    });
    const changed = [
      input.startsAt || input.endsAt ? 'time' : undefined,
      input.venue ? 'venue' : undefined,
      input.lecturerId ? 'educator' : undefined,
    ].filter(Boolean);
    await reminderService.notifyScheduleChange(actor.universityId, schedule.id, {
      title: 'Class schedule updated',
      body: changed.length
        ? `The ${changed.join(', ')} for an upcoming class changed. Review the latest schedule in Attendity.`
        : 'An upcoming class schedule changed. Review the latest details in Attendity.',
      category: 'class_schedule_updated',
    });
    await reminderService.reconcileSchedule(schedule.id);
    socketService.emitToUniversity(actor.universityId, 'class-schedule:updated', {
      scheduleId: schedule.id,
    });
    return this.findView(actor.universityId, schedule.id);
  }

  async cancel(
    actor: RequestActor,
    scheduleId: string,
    reason: string,
  ): Promise<ClassScheduleSummary> {
    const schedule = await this.manageable(actor, scheduleId);
    const previous = schedule.toJSON();
    schedule.set({
      status: 'cancelled',
      cancellationReason: reason,
      revision: schedule.revision + 1,
      updatedBy: actor.id,
    });
    await schedule.save();
    await reminderService.cancelScheduleDeliveries(actor.universityId, schedule.id, actor.id);
    await reminderService.notifyScheduleChange(actor.universityId, schedule.id, {
      title: 'Class cancelled',
      body: `An upcoming class was cancelled: ${reason}`,
      category: 'class_schedule_cancelled',
    });
    await auditService.record({
      action: 'class_schedule.cancelled',
      resourceType: 'class_schedule',
      resourceId: schedule.id,
      actor,
      oldValue: previous,
      newValue: schedule.toJSON(),
    });
    socketService.emitToUniversity(actor.universityId, 'class-schedule:cancelled', {
      scheduleId: schedule.id,
    });
    return this.findView(actor.universityId, schedule.id);
  }

  private async findView(universityId: string, scheduleId: string): Promise<ClassScheduleSummary> {
    const row = await ClassScheduleModel.findOne({ _id: scheduleId, universityId })
      .populate('courseId', 'code title')
      .populate('lecturerId', 'firstName lastName')
      .lean()
      .exec();
    if (!row) throw Object.assign(new Error('Class schedule was not found.'), { statusCode: 404 });
    return view(row);
  }
}

export const scheduleService = new ScheduleService();
