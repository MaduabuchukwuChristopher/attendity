import { act, fireEvent, render, screen } from '@testing-library/react';
import { LayoutDashboard } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDashboardScrollbars } from '../src/hooks/use-dashboard-scrollbars.js';
import { DashboardSidebar } from '../src/layouts/dashboard-sidebar.js';

const user = {
  email: 'lecturer@attendity.test',
  fullName: 'Lecturer User',
  id: 'lecturer-1',
  role: 'lecturer' as const,
  universityId: 'university-1',
};

const groups = [
  {
    label: 'Workspace',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', to: '/app/lecturer' }],
  },
];

function renderSidebar(onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <MemoryRouter>
        <DashboardSidebar
          groups={groups}
          institutionName="Attendity University"
          onClose={onClose}
          open
          user={user}
        />
      </MemoryRouter>,
    ),
  };
}

function ScrollbarHarness() {
  useDashboardScrollbars();
  return <div data-testid="scroll-region">Scrollable content</div>;
}

afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
  document.documentElement.className = '';
});

describe('dashboard shell behavior', () => {
  it('restores the sidebar scroll position after the layout remounts', () => {
    const first = renderSidebar();
    const sidebar = screen.getByRole('complementary', { name: 'Workspace navigation' });
    sidebar.scrollTop = 240;
    fireEvent.scroll(sidebar);
    first.unmount();

    renderSidebar();

    expect(screen.getByRole('complementary', { name: 'Workspace navigation' }).scrollTop).toBe(240);
  });

  it('still closes mobile navigation after a destination is selected', () => {
    const onClose = vi.fn();
    renderSidebar(onClose);

    fireEvent.click(screen.getByRole('link', { name: /Dashboard/ }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reveals slim dashboard scrollbars during activity and hides them after idle', () => {
    vi.useFakeTimers();
    const addEventListener = vi.spyOn(document, 'addEventListener');
    render(<ScrollbarHarness />);
    const region = screen.getByTestId('scroll-region');

    expect(document.documentElement).toHaveClass('dashboard-scrollbars');
    expect(addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.objectContaining({ capture: true, passive: true }),
    );
    fireEvent.scroll(region);
    expect(region).toHaveClass('is-scrolling');

    act(() => vi.advanceTimersByTime(900));

    expect(region).not.toHaveClass('is-scrolling');
  });
});
