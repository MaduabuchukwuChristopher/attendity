import './setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TrustedMediaService } from '../src/services/trusted-media.service.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

void describe('trusted export media resolution', () => {
  void it('accepts only the configured Cloudinary account and validates the returned image', async () => {
    const requested: string[] = [];
    const service = new TrustedMediaService({
      cloudName: 'attendity-demo',
      fetcher: async (input) => {
        requested.push(
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        );
        return new Response(png, {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': String(png.length) },
        });
      },
      findAsset: async () => undefined,
    });

    const resolved = await service.resolveImage({
      universityId: 'university-id',
      snapshotUrl:
        'https://res.cloudinary.com/attendity-demo/image/upload/v1/institution/logo.webp',
      contexts: ['institution_logo'],
    });

    assert.equal(resolved?.mimeType, 'image/png');
    assert.equal(resolved?.source, 'legacy_snapshot');
    assert.match(requested[0] ?? '', /\/image\/upload\/f_png\//);
    assert.equal(
      await service.resolveImage({
        universityId: 'university-id',
        snapshotUrl: 'https://evil.example/logo.png',
        contexts: ['institution_logo'],
      }),
      undefined,
    );
  });

  void it('rejects cross-tenant assets, redirects, oversized responses, and bad signatures', async () => {
    const crossTenant = new TrustedMediaService({
      cloudName: 'attendity-demo',
      findAsset: async () => undefined,
      fetcher: async () => new Response(png, { status: 200 }),
    });
    assert.equal(
      await crossTenant.resolveImage({
        universityId: 'other-university',
        assetId: 'asset-id',
        contexts: ['profile'],
      }),
      undefined,
    );

    for (const response of [
      new Response(null, { status: 302, headers: { location: 'https://evil.example/logo.png' } }),
      new Response(png, {
        status: 200,
        headers: { 'content-type': 'image/png', 'content-length': String(10 * 1024 * 1024 + 1) },
      }),
      new Response(Buffer.from('not-an-image'), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    ]) {
      const service = new TrustedMediaService({
        cloudName: 'attendity-demo',
        findAsset: async () => ({
          universityId: 'university-id',
          context: 'profile',
          status: 'ready',
          url: 'https://res.cloudinary.com/attendity-demo/image/upload/photo.jpg',
        }),
        fetcher: async () => response,
      });
      assert.equal(
        await service.resolveImage({
          universityId: 'university-id',
          assetId: 'asset-id',
          contexts: ['profile'],
        }),
        undefined,
      );
    }
  });
});
