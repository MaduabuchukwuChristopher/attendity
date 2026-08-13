import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';

interface PortalSummary {
  readonly users: number;
  readonly students: number;
  readonly lecturers: number;
  readonly departments: number;
  readonly courses: number;
  readonly unreadNotifications: number;
  readonly activeSessions: number;
  readonly pendingRegistrations: number;
}
interface ApiEnvelope<T> {
  readonly data: T;
}
export function usePortalSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['portal', 'summary'],
    enabled,
    queryFn: async () =>
      (await apiClient.get<ApiEnvelope<PortalSummary>>('/portal/summary')).data.data,
  });
}
