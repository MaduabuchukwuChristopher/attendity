import { apiClient } from '../../api/client.js';
import type { ReportFilters } from '../analytics/use-analytics.js';

export type AnalyticsExportFormat = 'pdf' | 'xlsx' | 'csv';

export async function downloadAnalyticsReport(
  format: AnalyticsExportFormat,
  filters: ReportFilters,
  reportId: string,
): Promise<void> {
  const exportFilters = {
    scope: filters.scope,
    from: filters.from,
    to: filters.to,
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
  };
  const response = await apiClient.get<Blob>('/analytics/reports/export', {
    params: { ...exportFilters, format },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportId}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}
