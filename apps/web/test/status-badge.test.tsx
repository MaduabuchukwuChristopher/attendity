import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../src/components/status-badge.js';

describe('Attendity status badge', () => {
  it.each([
    ['closed', 'text-red-700', 'dark:text-red-300'],
    ['open', 'text-emerald-700', 'dark:text-emerald-300'],
    ['pending', 'text-amber-700', 'dark:text-amber-300'],
    ['unmapped_state', 'text-slate-700', 'dark:text-slate-200'],
  ] as const)('renders %s with its accessible semantic treatment', (status, light, dark) => {
    render(<StatusBadge status={status} />);

    const visibleStatus = status
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
    expect(screen.getByText(visibleStatus)).toHaveClass(light, dark);
  });

  it('uses an explicit visible label without changing the status meaning', () => {
    render(<StatusBadge label="Awaiting approval" status="awaiting_approval" />);

    expect(screen.getByText('Awaiting approval')).toHaveClass(
      'text-amber-700',
      'dark:text-amber-300',
    );
  });
});
