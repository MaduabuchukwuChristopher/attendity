import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';

interface RegisteredCourseResponse {
  readonly _id: string;
  readonly courseId: {
    readonly _id: string;
    readonly code: string;
    readonly title: string;
    readonly creditUnits: number;
    readonly attendanceRequirement: number;
  } | null;
}

export interface RegisteredCourse {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly creditUnits: number;
  readonly attendanceRequirement: number;
}

interface ApiEnvelope<T> {
  readonly data: T;
}

export function useStudentRegistrations(enabled: boolean) {
  return useQuery({
    queryKey: ['registrations', 'mine'],
    enabled,
    queryFn: async () => {
      const response =
        await apiClient.get<ApiEnvelope<readonly RegisteredCourseResponse[]>>(
          '/registrations/mine',
        );

      return response.data.data.flatMap((registration) =>
        registration.courseId
          ? [
              {
                id: registration._id,
                code: registration.courseId.code,
                title: registration.courseId.title,
                creditUnits: registration.courseId.creditUnits,
                attendanceRequirement: registration.courseId.attendanceRequirement,
              },
            ]
          : [],
      );
    },
  });
}
