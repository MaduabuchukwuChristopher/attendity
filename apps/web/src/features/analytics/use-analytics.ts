import { useQuery } from '@tanstack/react-query';
import type {
  AcademicPeriodPreset,
  AnalyticsOverview,
  AnalyticsReport,
  AttendanceRisk,
} from '@qr/types';
import { apiClient } from '../../api/client.js';

interface Envelope<T> {
  readonly data: T;
}

export function useAnalyticsOverview(period: AcademicPeriodPreset | number, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'overview', period],
    enabled,
    queryFn: async () =>
      (
        await apiClient.get<Envelope<AnalyticsOverview>>('/analytics/overview', {
          params: typeof period === 'number' ? { days: period } : { period },
        })
      ).data.data,
  });
}

export function useMyAttendanceRisk(enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'my-risk'],
    enabled,
    queryFn: async () =>
      (await apiClient.get<Envelope<readonly AttendanceRisk[]>>('/analytics/my-risk')).data.data,
  });
}

export interface ReportFilters {
  readonly scope: 'university' | 'course' | 'student' | 'risk';
  readonly courseId?: string;
  readonly from: string;
  readonly to: string;
  readonly page: number;
  readonly limit: number;
}

export function useAnalyticsReport(filters: ReportFilters, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'report', filters],
    enabled,
    queryFn: async () =>
      (
        await apiClient.get<Envelope<AnalyticsReport>>('/analytics/reports', {
          params: filters,
        })
      ).data.data,
  });
}
