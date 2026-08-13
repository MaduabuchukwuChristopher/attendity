import { environment } from '../config/environment.js';
import { MediaAssetModel } from '../models/media-asset.model.js';
import { isImageContent, type ImageMimeType } from './media-image-validation.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
type TrustedContext = 'profile' | 'institution_logo';

interface TrustedAsset {
  readonly universityId: unknown;
  readonly context: string;
  readonly status: string;
  readonly url: string;
}

export interface ResolveImageInput {
  readonly universityId: string;
  readonly assetId?: string;
  readonly snapshotUrl?: string;
  readonly contexts: readonly TrustedContext[];
}

export interface ResolvedImage {
  readonly buffer: Buffer;
  readonly mimeType: 'image/png' | 'image/jpeg';
  readonly source: 'asset' | 'legacy_snapshot';
}

interface TrustedMediaDependencies {
  readonly cloudName?: string;
  readonly fetcher?: typeof fetch;
  readonly findAsset?: (assetId: string) => Promise<TrustedAsset | undefined>;
}

function cloudinaryPngUrl(value: string, cloudName: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return undefined;
    const segments = url.pathname.split('/');
    if (segments[1] !== cloudName || segments[2] !== 'image' || segments[3] !== 'upload')
      return undefined;
    if (segments[4] !== 'f_png') segments.splice(4, 0, 'f_png');
    url.pathname = segments.join('/');
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

async function boundedBody(response: Response): Promise<Buffer | undefined> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_IMAGE_BYTES) return undefined;
  if (!response.body) return undefined;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    total,
  );
}

export class TrustedMediaService {
  private readonly cloudName: string;
  private readonly fetcher: typeof fetch;
  private readonly findAsset: (assetId: string) => Promise<TrustedAsset | undefined>;

  constructor(dependencies: TrustedMediaDependencies = {}) {
    this.cloudName = dependencies.cloudName ?? environment.CLOUDINARY_CLOUD_NAME ?? '';
    this.fetcher = dependencies.fetcher ?? fetch;
    this.findAsset =
      dependencies.findAsset ??
      (async (assetId) => {
        const asset = await MediaAssetModel.findById(assetId)
          .select('universityId context status url')
          .lean()
          .exec();
        return asset
          ? {
              universityId: asset.universityId,
              context: asset.context,
              status: asset.status,
              url: asset.url,
            }
          : undefined;
      });
  }

  async resolveImage(input: ResolveImageInput): Promise<ResolvedImage | undefined> {
    let value = input.snapshotUrl;
    let source: ResolvedImage['source'] = 'legacy_snapshot';
    if (input.assetId) {
      const asset = await this.findAsset(input.assetId);
      if (
        !asset ||
        String(asset.universityId) !== input.universityId ||
        asset.status !== 'ready' ||
        !input.contexts.includes(asset.context as TrustedContext)
      )
        return undefined;
      value = asset.url;
      source = 'asset';
    }
    if (!value || !this.cloudName) return undefined;
    const url = cloudinaryPngUrl(value, this.cloudName);
    if (!url) return undefined;
    try {
      const response = await this.fetcher(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(5_000),
        headers: { accept: 'image/png,image/jpeg' },
      });
      if (!response.ok || response.status >= 300) return undefined;
      const contentType = response.headers.get('content-type')?.split(';')[0];
      if (contentType !== 'image/png' && contentType !== 'image/jpeg') return undefined;
      const buffer = await boundedBody(response);
      if (!buffer || !isImageContent(contentType, buffer)) return undefined;
      return { buffer, mimeType: contentType, source };
    } catch {
      return undefined;
    }
  }
}

export const trustedMediaService = new TrustedMediaService();
