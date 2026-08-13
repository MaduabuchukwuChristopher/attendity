import type { RequestHandler } from 'express';
import { attendanceService } from '../services/attendance.service.js';
import { notificationService } from '../services/notification.service.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

function parameter(value: string | string[] | undefined, message: string): string {
  if (typeof value !== 'string') throw Object.assign(new Error(message), { statusCode: 404 });
  return value;
}

export const getLecturerWorkspace: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Lecturer attendance workspace retrieved.',
      data: await attendanceService.lecturerWorkspace(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createAttendanceSession: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Attendance session opened.',
      data: await attendanceService.createSession(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const closeAttendanceSession: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Attendance session closed.',
      data: await attendanceService.closeSession(
        actor(request),
        parameter(request.params.sessionId, 'Attendance session was not found.'),
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const downloadStaticAttendanceQr: RequestHandler = async (request, response, next) => {
  try {
    const exportFile = await attendanceService.staticQrPdf(
      actor(request),
      parameter(request.params.sessionId, 'Attendance session was not found.'),
    );
    response.set({
      'Cache-Control': 'no-store, private',
      'Content-Disposition': `attachment; filename="${exportFile.fileName}"`,
      'Content-Type': 'application/pdf',
    });
    response.send(exportFile.buffer);
  } catch (error) {
    next(error);
  }
};

export const getStudentWorkspace: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Student attendance progress retrieved.',
      data: await attendanceService.studentWorkspace(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceRequirements: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Attendance verification requirements retrieved.',
      data: await attendanceService.requirements(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const enrolFaceProfile: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Face profile enrolled securely.',
      data: await attendanceService.enrolFace(actor(request), request.body.imageCapture),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const checkInToAttendance: RequestHandler = async (request, response, next) => {
  try {
    const ipAddress = request.ip;
    const userAgent = request.get('user-agent');
    response.status(201).json({
      success: true,
      message: 'Attendance recorded successfully.',
      data: await attendanceService.checkIn(actor(request), request.body, {
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (request.actor?.role === 'student') {
      try {
        await notificationService.create({
          universityId: request.actor.universityId,
          recipientId: request.actor.id,
          title: 'Attendance attempt unsuccessful',
          body:
            error instanceof Error &&
            'statusCode' in error &&
            typeof error.statusCode === 'number' &&
            error.statusCode < 500
              ? error.message
              : 'The attendance attempt could not be completed. Please try again.',
          category: 'attendance_failed',
          priority: 'normal',
        });
      } catch (notificationError) {
        request.log.warn({ error: notificationError }, 'Unable to create failure notification');
      }
    }
    next(error);
  }
};

export const verifyClearance: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Student clearance retrieved.',
      data: await attendanceService.verifyClearance(
        actor(request),
        parameter(request.params.registrationNumber, 'Registration number was not found.'),
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
