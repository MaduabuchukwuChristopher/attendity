import type { UserRole } from '@qr/types';

export const DEFAULT_INSTITUTION_CODE = 'lagos-metropolitan-university';

export const institutionOptions = [
  { label: 'Lagos Metropolitan University', value: DEFAULT_INSTITUTION_CODE },
] as const;

export const assessmentRoleOptions = [
  { label: 'Institution Admin', value: 'university_admin' },
  { label: 'Lecturer', value: 'lecturer' },
  { label: 'Examiner', value: 'examiner' },
  { label: 'Student', value: 'student' },
] as const satisfies readonly { readonly label: string; readonly value: UserRole }[];

export function assessmentRegistrationEnabled(
  configured: unknown = import.meta.env.VITE_ALLOW_DEMO_ROLE_REGISTRATION,
): boolean {
  return configured === 'true' || (configured === undefined && import.meta.env.PROD);
}

export function roleLabel(role: UserRole): string {
  return assessmentRoleOptions.find((option) => option.value === role)?.label ?? 'Student';
}
