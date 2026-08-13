import { useQuery } from '@tanstack/react-query';
import type { NotificationPage } from '@qr/types';
import { apiClient } from '../../api/client.js';

interface Envelope<T> {
  readonly data: T;
}

export type NotificationStatus = 'all' | 'unread' | 'read' | 'archived';

export function useNotifications(
  status: NotificationStatus = 'all',
  page = 1,
  limit = 20,
  enabled = true,
) {
  return useQuery({
    queryKey: ['notifications', status, page, limit],
    enabled,
    queryFn: async () =>
      (
        await apiClient.get<Envelope<NotificationPage>>('/notifications', {
          params: { status, page, limit },
        })
      ).data.data,
  });
}
