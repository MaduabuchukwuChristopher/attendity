import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAnalyticsPeriod } from '../src/services/analytics.service.js';

const now = new Date('2026-08-10T19:00:00.000Z');
const settings = {
  timeZone: 'Africa/Lagos',
  currentTermStart: new Date('2026-05-04T00:00:00.000Z'),
  currentTermEnd: new Date('2026-09-01T00:00:00.000Z'),
};

void describe('academic analytics periods', () => {
  void it('resolves institution-local daily, weekly and monthly boundaries', () => {
    assert.equal(
      resolveAnalyticsPeriod(settings, { period: 'daily' }, now).from.toISOString(),
      '2026-08-09T23:00:00.000Z',
    );
    assert.equal(
      resolveAnalyticsPeriod(settings, { period: 'weekly' }, now).from.toISOString(),
      '2026-08-09T23:00:00.000Z',
    );
    assert.equal(
      resolveAnalyticsPeriod(settings, { period: 'monthly' }, now).from.toISOString(),
      '2026-07-31T23:00:00.000Z',
    );
  });

  void it('uses the configured current term for semester analytics', () => {
    const result = resolveAnalyticsPeriod(settings, { period: 'semester' }, now);
    assert.equal(result.preset, 'semester');
    assert.equal(result.from.toISOString(), settings.currentTermStart.toISOString());
    assert.equal(result.to.toISOString(), now.toISOString());
  });

  void it('preserves bounded legacy day queries and validates custom ranges', () => {
    const legacy = resolveAnalyticsPeriod(settings, { days: 30 }, now);
    assert.equal(legacy.preset, 'custom');
    assert.equal(legacy.days, 30);
    assert.throws(() =>
      resolveAnalyticsPeriod(
        settings,
        { period: 'custom', from: new Date('2026-08-02'), to: new Date('2026-08-01') },
        now,
      ),
    );
    assert.throws(() =>
      resolveAnalyticsPeriod(
        settings,
        { period: 'custom', from: new Date('2025-01-01'), to: new Date('2026-08-01') },
        now,
      ),
    );
  });
});
