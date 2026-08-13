import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClearanceArchivePage, ClearanceReportDetail, CourseEligibility } from '@qr/types';
import { apiClient } from '../../api/client.js';

interface Envelope<T> {
  readonly data: T;
}

export function useEligibility(enabled = true) {
  return useQuery({
    queryKey: ['clearance', 'eligibility'],
    queryFn: async () =>
      (await apiClient.get<Envelope<readonly CourseEligibility[]>>('/clearance/eligibility')).data
        .data,
    enabled,
  });
}

export function useClearanceArchive(enabled = true) {
  return useQuery({
    queryKey: ['clearance', 'archive'],
    queryFn: async () =>
      (
        await apiClient.get<Envelope<ClearanceArchivePage>>('/clearance/reports', {
          params: { page: 1, limit: 100 },
        })
      ).data.data,
    enabled,
  });
}

export function useGenerateClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) =>
      (
        await apiClient.post<Envelope<ClearanceReportDetail>>('/clearance/reports', {
          courseId,
        })
      ).data.data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clearance'] });
    },
  });
}

function downloadName(disposition: string | undefined, fallback: string): string {
  const match = /filename="([^"]+)"/i.exec(disposition ?? '');
  return match?.[1] ?? fallback;
}

export async function downloadClearance(
  reportId: string,
  format: 'pdf' | 'xlsx' | 'csv',
): Promise<void> {
  const response = await apiClient.get<Blob>(`/clearance/reports/${reportId}/${format}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  const disposition = response.headers['content-disposition'] as unknown;
  link.download = downloadName(
    typeof disposition === 'string' ? disposition : undefined,
    `${reportId}.${format}`,
  );
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function printClearance(reportId: string): Promise<void> {
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) {
    throw new Error('Allow pop-ups to open the professional print document.');
  }
  printWindow.opener = null;
  try {
    const response = await apiClient.get<Blob>(`/clearance/reports/${reportId}/print`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    printWindow.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    printWindow.close();
    throw error;
  }
}

export async function shareClearance(reportId: string): Promise<'shared' | 'copied'> {
  const report = (
    await apiClient.post<Envelope<{ readonly reportId: string; readonly verificationUrl: string }>>(
      `/clearance/reports/${reportId}/share`,
    )
  ).data.data;
  if (navigator.share) {
    await navigator.share({
      title: `Attendance clearance ${report.reportId}`,
      text: `Server verification for attendance clearance ${report.reportId}`,
      url: report.verificationUrl,
    });
    return 'shared';
  }
  await navigator.clipboard.writeText(report.verificationUrl);
  return 'copied';
}
