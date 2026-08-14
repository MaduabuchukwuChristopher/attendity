import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/api/client.js';
import { downloadAnalyticsReport } from '../src/features/reports/report-export.js';

afterEach(() => vi.restoreAllMocks());

describe('analytics report download actions', () => {
  it('downloads the requested authenticated report format', async () => {
    const click = vi.fn();
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: new Blob(['report']) } as never);
    vi.spyOn(document, 'createElement').mockReturnValue({ click } as unknown as HTMLAnchorElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await downloadAnalyticsReport(
      'xlsx',
      { scope: 'university', from: '2026-08-01', to: '2026-08-12', page: 1, limit: 25 },
      'ATR-DEMO',
    );

    expect(apiClient.get).toHaveBeenCalledWith('/analytics/reports/export', {
      params: {
        format: 'xlsx',
        from: '2026-08-01',
        scope: 'university',
        to: '2026-08-12',
      },
      responseType: 'blob',
    });
    expect(click).toHaveBeenCalledOnce();
  });
});
