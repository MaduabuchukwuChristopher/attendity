import type {
  ApiResponse,
  EventAnalytics,
  EventPage,
  EventParticipantPage,
  EventParticipationSummary,
} from '@qr/types';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';

export interface EventFilters {
  readonly search: string;
  readonly status: string;
  readonly eventType: string;
  readonly mandatory: string;
  readonly page: number;
}

function queryString(filters: EventFilters): string {
  return new URLSearchParams({
    search: filters.search,
    status: filters.status,
    eventType: filters.eventType,
    mandatory: filters.mandatory,
    page: String(filters.page),
    limit: '50',
  }).toString();
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ['events', 'feed', filters],
    refetchInterval: 60_000,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<EventPage>>(`/events?${queryString(filters)}`)).data.data,
  });
}

export function useManagedEvents(filters: EventFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['events', 'manage', filters],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<EventPage>>(`/events/manage?${queryString(filters)}`)).data
        .data,
  });
}

export interface EventHistoryFilters {
  readonly academicSessionId: string;
  readonly termId: string;
  readonly eventType: string;
  readonly mandatory: string;
  readonly status: string;
  readonly page: number;
}

export function useEventHistory(filters: EventHistoryFilters, enabled: boolean) {
  const query = new URLSearchParams({
    ...(filters.academicSessionId ? { academicSessionId: filters.academicSessionId } : {}),
    ...(filters.termId ? { termId: filters.termId } : {}),
    eventType: filters.eventType,
    mandatory: filters.mandatory,
    status: filters.status,
    page: String(filters.page),
    limit: '25',
  });
  return useQuery({
    queryKey: ['events', 'history', filters],
    enabled,
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<EventParticipationSummary>>(
          `/events/history?${query.toString()}`,
        )
      ).data.data,
  });
}

export interface EventAnalyticsFilters {
  readonly from: string;
  readonly to: string;
}

export function useEventAnalytics(
  eventId: string | undefined,
  filters: EventAnalyticsFilters,
  enabled: boolean,
) {
  const query = new URLSearchParams({
    ...(filters.from ? { from: new Date(`${filters.from}T00:00:00.000Z`).toISOString() } : {}),
    ...(filters.to ? { to: new Date(`${filters.to}T23:59:59.999Z`).toISOString() } : {}),
  });
  return useQuery({
    queryKey: ['events', 'analytics', eventId, filters],
    enabled: enabled && Boolean(eventId),
    refetchInterval: 30_000,
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<EventAnalytics>>(
          `/events/${eventId}/analytics?${query.toString()}`,
        )
      ).data.data,
  });
}

export function useEventParticipants(
  eventId: string | undefined,
  filters: { readonly search: string; readonly status: string; readonly page: number },
  enabled: boolean,
) {
  const query = new URLSearchParams({
    search: filters.search,
    status: filters.status,
    page: String(filters.page),
    limit: '25',
  });
  return useQuery({
    queryKey: ['events', 'participants', eventId, filters],
    enabled: enabled && Boolean(eventId),
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<EventParticipantPage>>(
          `/events/${eventId}/participants?${query.toString()}`,
        )
      ).data.data,
  });
}
