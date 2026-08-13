import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalyticsPeriodControl } from '../src/features/analytics/analytics-period-control.js';

describe('dashboard academic period control', () => {
  it('offers academic presets and reports selection accessibly', () => {
    let selected = 'monthly';
    render(
      <AnalyticsPeriodControl
        value="monthly"
        onChange={(value) => {
          selected = value;
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Semester' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    expect(selected).toBe('weekly');
  });
});
