import {
  Card,
  CardHeader,
  BrandMark,
  Button,
  DataTable,
  Dialog,
  MetricCard,
  PercentageValue,
  SemanticValue,
} from '@qr/ui';
import { render, screen, within } from '@testing-library/react';
import { CalendarDays, Download, Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';

describe('dashboard shared primitives', () => {
  it('uses semantic values, icon headings, and non-white card surfaces', () => {
    render(
      <>
        <Card aria-label="Default dashboard card">
          <span>Operations</span>
        </Card>
        <SemanticValue tone="blue" value={128} />
        <CardHeader icon={<CalendarDays />} title="Sessions" tone="violet" />
        <MetricCard icon={<Users />} label="Students" tone="teal" value={420} />
      </>,
    );

    expect(screen.getByRole('region', { name: 'Default dashboard card' })).toHaveClass(
      'bg-slate-100',
      'dark:bg-slate-900',
    );
    expect(screen.getByText('128')).toHaveClass('text-blue-700', 'dark:text-blue-300');
    expect(screen.getByRole('heading', { name: 'Sessions' })).toBeVisible();
    expect(screen.getByTestId('card-header-icon')).toHaveClass('bg-violet-700');
    expect(screen.getByText('420')).toHaveClass('text-teal-800', 'dark:text-teal-200');
  });

  it('uses explicit shared spacing for brand and button icon labels', () => {
    render(
      <>
        <BrandMark />
        <Button>
          <Download aria-hidden="true" /> Download report
        </Button>
      </>,
    );

    expect(screen.getByText('Attendity').parentElement).toHaveClass('gap-3');
    expect(screen.getByRole('button', { name: 'Download report' })).toHaveClass('gap-2');
  });

  it('keeps dialog actions visible while only the content region scrolls', () => {
    render(
      <Dialog
        footer={<button type="button">Open session</button>}
        isOpen
        onClose={() => undefined}
        title="Start class attendance"
      >
        <div>Long attendance form</div>
      </Dialog>,
    );

    expect(screen.getByTestId('dialog-panel')).toHaveClass(
      'max-h-[calc(100dvh-2rem)]',
      'flex-col',
      'overflow-hidden',
    );
    expect(screen.getByTestId('dialog-scroll-region')).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    );
    expect(screen.getByText('Open session').parentElement).toHaveClass('shrink-0');
  });

  it('gives tables and semantic rows tinted light and dark surfaces', () => {
    render(
      <DataTable
        caption="Attendance risks"
        columns={[{ id: 'student', header: 'Student', cell: (row) => row.student }]}
        rowTone={(row) => (row.status === 'risk' ? 'rose' : 'green')}
        rows={[
          { id: 'student-1', status: 'risk', student: 'At risk' },
          { id: 'student-2', status: 'healthy', student: 'On track' },
        ]}
      />,
    );

    const table = screen.getByRole('table', { name: 'Attendance risks' });
    expect(table.parentElement).toHaveClass('bg-emerald-50', 'dark:bg-slate-950');
    expect(within(table).getAllByRole('rowgroup')[1]).toHaveClass(
      'bg-emerald-50/70',
      'dark:bg-slate-950',
    );
    expect(within(table).getByRole('columnheader', { name: 'Student' })).toHaveClass(
      'bg-university-navy',
      'dark:bg-slate-900',
      'text-white',
    );
    const row = within(table).getByRole('row', { name: 'At risk' });
    expect(row).toHaveClass('border-l-rose-600', 'bg-rose-50/80', 'dark:bg-rose-950/30');
    expect(within(row).getByRole('cell')).toHaveClass('dark:text-slate-100');
  });

  it('never renders metric values or percentages with an uncoloured default', () => {
    render(
      <>
        <MetricCard label="Sessions" tone="violet" value={34} />
        <PercentageValue value={35} />
        <PercentageValue value={65} />
        <PercentageValue value={80} />
      </>,
    );

    expect(screen.getByText('34')).toHaveClass('text-violet-800', 'dark:text-violet-200');
    expect(screen.getByText('35%')).toHaveClass('text-rose-700');
    expect(screen.getByText('65%')).toHaveClass('text-amber-700');
    expect(screen.getByText('80%')).toHaveClass('text-emerald-700');
  });
});
