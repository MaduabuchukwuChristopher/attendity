import type { AnnouncementPage, ApiResponse } from '@qr/types';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';

export interface AnnouncementFilters {
  readonly search: string;
  readonly category: string;
  readonly priority: string;
  readonly status: string;
  readonly sort: 'newest' | 'oldest' | 'priority' | 'expires_soon';
  readonly page: number;
}

function queryString(filters: AnnouncementFilters): string {
  const query = new URLSearchParams({
    search: filters.search,
    category: filters.category,
    priority: filters.priority,
    status: filters.status,
    sort: filters.sort,
    page: String(filters.page),
    limit: '20',
  });
  return query.toString();
}

export function useAnnouncements(filters: AnnouncementFilters) {
  return useQuery({
    queryKey: ['announcements', 'feed', filters],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<AnnouncementPage>>(`/announcements?${queryString(filters)}`))
        .data.data,
  });
}

export function useManagedAnnouncements(
  filters: Pick<AnnouncementFilters, 'search' | 'status' | 'sort' | 'page'>,
  enabled: boolean,
) {
  const query = new URLSearchParams({
    search: filters.search,
    status: filters.status,
    sort: filters.sort,
    page: String(filters.page),
    limit: '20',
  });
  return useQuery({
    queryKey: ['announcements', 'manage', filters],
    enabled,
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<AnnouncementPage>>(
          `/announcements/manage?${query.toString()}`,
        )
      ).data.data,
  });
}
