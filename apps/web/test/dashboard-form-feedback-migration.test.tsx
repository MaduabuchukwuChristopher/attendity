import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const feedbackManagedPages = [
  'src/features/settings/settings-page.tsx',
  'src/features/academic/academic-management-page.tsx',
  'src/features/academic/class-schedules-page.tsx',
  'src/features/academic/curriculum-management-page.tsx',
  'src/features/academic/institution-structure-page.tsx',
  'src/features/registrations/registration-management-page.tsx',
  'src/features/users/user-management-page.tsx',
  'src/features/auth/account-page.tsx',
  'src/features/announcements/announcements-page.tsx',
  'src/features/events/events-page.tsx',
] as const;

describe('dashboard form feedback migration', () => {
  it.each(feedbackManagedPages)('%s uses shared accessible feedback', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).toMatch(/MutationFormFeedback|FormActionFeedback|useDashboardToast/);
  });

  it('keeps scanner feedback local to its purpose-built workflow', () => {
    const studentScanner = readFileSync(
      resolve(process.cwd(), 'src/features/portals/student-workspace-page.tsx'),
      'utf8',
    );
    expect(studentScanner).not.toContain('MutationFormFeedback');
  });
});
