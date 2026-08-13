import type {
  ApiResponse,
  ClassSchedulePage,
  NotificationChannel,
  ReminderHistoryPage,
  ReminderPreference,
} from '@qr/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';

export interface ReminderPreferenceInput {
  readonly enabled: boolean;
  readonly defaultOffsetMinutes: number;
  readonly channels: readonly NotificationChannel[];
  readonly preferredTimeZone?: string;
  readonly quietHours: {
    readonly enabled: boolean;
    readonly startMinute: number;
    readonly endMinute: number;
  };
  readonly mutedCourseIds: readonly string[];
  readonly overrides: readonly {
    readonly scheduleId: string;
    readonly enabled: boolean;
    readonly offsetMinutes?: number;
    readonly channels?: readonly NotificationChannel[];
  }[];
}

export function useReminderPreference(enabled = true) {
  return useQuery({
    queryKey: ['reminders', 'preference'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<ReminderPreference>>('/notifications/reminders/preferences'))
        .data.data,
    enabled,
  });
}

export function useReminderHistory(enabled = true) {
  return useQuery({
    queryKey: ['reminders', 'history'],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<ReminderHistoryPage>>(
          '/notifications/reminders/history?limit=10',
        )
      ).data.data,
    enabled,
  });
}

export function useUpcomingSchedules(enabled = true) {
  return useQuery({
    queryKey: ['class-schedules', 'upcoming'],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<ClassSchedulePage>>(
          `/academic/schedules?status=scheduled&from=${encodeURIComponent(new Date().toISOString())}&limit=100`,
        )
      ).data.data,
    enabled,
  });
}

export function useReminderActions() {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['reminders'] }),
      client.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  };
  return {
    save: useMutation({
      mutationFn: (body: ReminderPreferenceInput) =>
        apiClient.put('/notifications/reminders/preferences', body),
      onSuccess: refresh,
    }),
    reset: useMutation({
      mutationFn: () => apiClient.post('/notifications/reminders/preferences/reset'),
      onSuccess: refresh,
    }),
    test: useMutation({
      mutationFn: (channel: NotificationChannel) =>
        apiClient.post(`/notifications/reminders/test/${channel}`),
      onSuccess: refresh,
    }),
    subscribePush: useMutation({
      mutationFn: (subscription: PushSubscriptionJSON) =>
        apiClient.post('/notifications/push/subscriptions', subscription),
      onSuccess: refresh,
    }),
    revokePush: useMutation({
      mutationFn: (endpoint: string) =>
        apiClient.delete('/notifications/push/subscriptions', { data: { endpoint } }),
      onSuccess: refresh,
    }),
  };
}
