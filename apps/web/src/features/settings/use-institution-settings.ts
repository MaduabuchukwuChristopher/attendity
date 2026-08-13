import { useQuery } from '@tanstack/react-query';
import type { InstitutionSettings } from '@qr/types';
import { apiClient } from '../../api/client.js';

export function useInstitutionSettings(enabled = true) {
  return useQuery({
    queryKey: ['institution-settings'],
    queryFn: async () =>
      (await apiClient.get<{ data: InstitutionSettings }>('/settings/institution')).data.data,
    enabled,
    staleTime: 5 * 60_000,
  });
}
