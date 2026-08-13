import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, LecturerProfile, StudentProfile } from '@qr/types';
import { apiClient } from '../../api/client.js';
import { useAuthStore } from '../../store/auth-store.js';
import type { LecturerProfileValues } from './lecturer-profile-form.js';
import type { StudentProfileValues } from './student-profile-form.js';

export interface ProfileUser {
  readonly _id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string;
  readonly photoUrl?: string;
}

export interface MyProfileResponse {
  readonly role: string;
  readonly user: ProfileUser;
  readonly profile: StudentProfile | LecturerProfile | null;
  readonly assignments?: readonly Record<string, unknown>[];
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<MyProfileResponse>>('/profiles/me')).data.data,
  });
}

export interface ProfileSaveResult {
  readonly photoUrl?: string;
}

export async function saveProfile(
  role: 'student' | 'lecturer',
  values: StudentProfileValues | LecturerProfileValues,
): Promise<ProfileSaveResult> {
  const { photoFile, ...profile } = values;
  const photo = photoFile ? await uploadProfilePhoto(photoFile) : undefined;
  await apiClient.patch(`/profiles/${role}`, {
    ...profile,
    ...(photo ? { photoAssetId: photo.assetId, photoUrl: photo.url } : {}),
  });
  return photo ? { photoUrl: photo.url } : {};
}

export function useSaveProfile(role: 'student' | 'lecturer') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: StudentProfileValues | LecturerProfileValues) => saveProfile(role, values),
    onSuccess: async (result) => {
      if (result.photoUrl)
        useAuthStore.getState().updateUserPresentation({ photoUrl: result.photoUrl });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['profile', 'me'] }),
        client.invalidateQueries({ queryKey: ['registrations'] }),
      ]);
    },
  });
}

export async function uploadProfilePhoto(
  file: File,
): Promise<{ readonly assetId: string; readonly url: string }> {
  const response = await apiClient.post<
    ApiResponse<{ readonly assetId: string; readonly url: string }>
  >('/uploads/profile', file, {
    headers: { 'Content-Type': file.type, 'x-file-name': encodeURIComponent(file.name) },
  });
  return response.data.data;
}
