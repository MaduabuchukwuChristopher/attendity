import { Button, Card, DataTable, Dialog, Input } from '@qr/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../src/contexts/theme-context.js';
import { AuthLayout } from '../src/features/auth/auth-layout.js';
import { DashboardLayout } from '../src/layouts/dashboard-layout.js';
import { DashboardTopbar } from '../src/layouts/dashboard-topbar.js';
import { useAuthStore } from '../src/store/auth-store.js';

const user = {
  email: 'student@attendity.test',
  fullName: 'Student User',
  id: 'student-1',
  role: 'student' as const,
  universityId: 'university-1',
};

describe('mobile responsive shared surfaces', () => {
  it('provides a coloured sticky navigation bar on authentication pages', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AuthLayout>
            <h1>Sign in</h1>
          </AuthLayout>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole('navigation', { name: 'Authentication navigation' })).toHaveClass(
      'sticky',
      'top-0',
      'z-40',
      'bg-university-navy',
      'lg:hidden',
    );
    expect(screen.getByRole('main')).toHaveClass('overflow-x-clip');
  });

  it('keeps the dashboard shell and mobile topbar constrained to the viewport', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useAuthStore.getState().clearSession();
    const layout = render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <MemoryRouter>
            <DashboardLayout>
              <section>Dashboard content</section>
            </DashboardLayout>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('dashboard-shell')).toHaveClass(
      'min-w-0',
      'max-w-full',
      'overflow-x-clip',
    );
    expect(screen.getByRole('main')).toHaveClass('min-w-0', 'w-full', 'max-w-full');
    layout.unmount();

    render(
      <MemoryRouter>
        <DashboardTopbar
          canViewNotifications
          canViewReports
          institutionName="Attendity University"
          onMenu={() => undefined}
          onSignOut={() => undefined}
          onToggleTheme={() => undefined}
          signingOut={false}
          theme="light"
          unreadNotifications={2}
          user={user}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toHaveClass(
      'sticky',
      'top-0',
      'z-40',
      'min-w-0',
      'w-full',
    );
  });

  it('contains wide tables inside their own horizontal scroll region', () => {
    render(
      <DataTable
        caption="Responsive attendance"
        columns={[
          { id: 'student', header: 'Student', cell: (row) => row.student },
          { id: 'course', header: 'Course', cell: (row) => row.course },
        ]}
        rows={[{ id: 'record-1', student: 'Amina Bello', course: 'Software Engineering' }]}
      />,
    );

    expect(screen.getByRole('table', { name: 'Responsive attendance' }).parentElement).toHaveClass(
      'min-w-0',
      'max-w-full',
      'overflow-x-auto',
      'overscroll-x-contain',
    );
  });

  it('stacks dialog actions and constrains shared form controls on small screens', () => {
    render(
      <>
        <Card aria-label="Responsive card">
          <Input label="Institution" name="institution" />
          <Button>Save institution profile with a long action label</Button>
        </Card>
        <Dialog
          footer={
            <>
              <Button variant="secondary">Cancel</Button>
              <Button>Save changes</Button>
            </>
          }
          isOpen
          onClose={() => undefined}
          title="Responsive form"
        >
          <Input label="Course" name="course" />
        </Dialog>
      </>,
    );

    expect(screen.getByRole('region', { name: 'Responsive card' })).toHaveClass(
      'min-w-0',
      'max-w-full',
    );
    for (const input of screen.getAllByRole('textbox')) {
      expect(input).toHaveClass('min-w-0', 'w-full', 'max-w-full');
    }
    expect(screen.getByRole('button', { name: /Save institution profile/ })).toHaveClass(
      'max-w-full',
      'whitespace-normal',
    );
    expect(screen.getByText('Save changes').parentElement).toHaveClass(
      'flex-col-reverse',
      'sm:flex-row',
      'max-w-full',
    );
  });
});
