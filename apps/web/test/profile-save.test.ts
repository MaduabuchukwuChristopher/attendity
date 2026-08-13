import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/api/client.js';
import { saveProfile, useSaveProfile } from '../src/features/profiles/use-profile.js';
import { useAuthStore } from '../src/store/auth-store.js';

const studentValues = {
  matricNumber: 'ATD/CSC/001',
  phone: '+2348012345678',
  campusId: 'campus-id',
  facultyId: 'faculty-id',
  departmentId: 'department-id',
  programmeId: 'programme-id',
  levelId: 'level-id',
  admissionSessionId: 'session-id',
};

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  useAuthStore.getState().clearSession();
});

describe('profile save orchestration', () => {
  it('uploads a selected photograph before saving its secure reference', async () => {
    const photo = new File(['profile-image'], 'student profile.jpg', { type: 'image/jpeg' });
    const secureUrl = 'https://res.cloudinary.com/attendity/image/upload/student.jpg';
    let uploadResolved = false;
    vi.spyOn(apiClient, 'post').mockImplementation(async () => {
      uploadResolved = true;
      return {
        data: {
          success: true,
          message: 'uploaded',
          timestamp: new Date(0).toISOString(),
          data: { assetId: 'asset-id', url: secureUrl },
        },
      } as never;
    });
    const patch = vi.spyOn(apiClient, 'patch').mockImplementation(async (_url, body) => {
      expect(uploadResolved).toBe(true);
      expect(body).toEqual({
        ...studentValues,
        photoAssetId: 'asset-id',
        photoUrl: secureUrl,
      });
      return { data: {} } as never;
    });

    const result = await saveProfile('student', { ...studentValues, photoFile: photo });

    expect(patch).toHaveBeenCalledWith('/profiles/student', expect.any(Object));
    expect(result).toEqual({ photoUrl: secureUrl });
  });

  it('does not update a profile when secure photograph storage rejects the upload', async () => {
    const photo = new File(['profile-image'], 'student.jpg', { type: 'image/jpeg' });
    const uploadFailure = new Error('Secure file storage rejected the upload.');
    vi.spyOn(apiClient, 'post').mockRejectedValue(uploadFailure);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as never);

    await expect(saveProfile('student', { ...studentValues, photoFile: photo })).rejects.toBe(
      uploadFailure,
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it('saves a profile directly when no new photograph was selected', async () => {
    const upload = vi.spyOn(apiClient, 'post');
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as never);

    const result = await saveProfile('student', studentValues);

    expect(upload).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith('/profiles/student', studentValues);
    expect(result).toEqual({});
  });

  it('updates authenticated presentation immediately after a saved photograph', async () => {
    const photoUrl = 'https://res.cloudinary.com/attendity/image/upload/new-student.jpg';
    useAuthStore.getState().setSession(
      {
        id: 'student-id',
        universityId: 'university-id',
        email: 'student@example.edu',
        fullName: 'Student User',
        role: 'student',
      },
      'access-token',
    );
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { data: { assetId: 'asset-id', url: photoUrl } },
    } as never);
    vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as never);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useSaveProfile('student'), { wrapper });

    act(() =>
      result.current.mutate({
        ...studentValues,
        photoFile: new File(['profile'], 'profile.jpg', { type: 'image/jpeg' }),
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user?.photoUrl).toBe(photoUrl);
  });
});
