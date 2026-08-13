export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export const IMAGE_MIME_TYPES: readonly ImageMimeType[] = ['image/jpeg', 'image/png', 'image/webp'];

export function isImageContent(mimeType: ImageMimeType, buffer: Buffer): boolean {
  if (mimeType === 'image/jpeg')
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png')
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return (
    buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  );
}
