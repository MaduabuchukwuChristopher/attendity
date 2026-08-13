import { CourseModel } from '../models/course.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { UserModel } from '../models/user.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';

export class PortalService {
  async summary(
    universityId: string,
    userId: string,
  ): Promise<{
    users: number;
    students: number;
    lecturers: number;
    departments: number;
    courses: number;
    activeSessions: number;
    pendingRegistrations: number;
    unreadNotifications: number;
  }> {
    const [
      users,
      students,
      lecturers,
      departments,
      courses,
      activeSessions,
      pendingRegistrations,
      unreadNotifications,
    ] = await Promise.all([
      UserModel.countDocuments({ universityId }),
      UserModel.countDocuments({ universityId, role: 'student', accountStatus: 'active' }),
      UserModel.countDocuments({ universityId, role: 'lecturer', accountStatus: 'active' }),
      DepartmentModel.countDocuments({ universityId }),
      CourseModel.countDocuments({ universityId }),
      AttendanceSessionModel.countDocuments({ universityId, status: 'open' }),
      CourseRegistrationModel.countDocuments({ universityId, status: 'pending' }),
      NotificationModel.countDocuments({
        universityId,
        recipientId: userId,
        readAt: { $exists: false },
      }),
    ]);
    return {
      users,
      students,
      lecturers,
      departments,
      courses,
      activeSessions,
      pendingRegistrations,
      unreadNotifications,
    };
  }
}
export const portalService = new PortalService();
