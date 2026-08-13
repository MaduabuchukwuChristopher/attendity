export interface StaticQrPosterMetadata {
  readonly checkInWindow: string;
  readonly course: string;
  readonly institution: string;
  readonly lecturer: string;
  readonly logoUrl?: string;
}

function fileSlug(course: string): string {
  return course
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

function loadImage(source: string, anonymous = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (anonymous) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The QR image could not be prepared for export.'));
    image.src = source;
  });
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else line = candidate;
  }
  if (line) context.fillText(line, x, cursorY);
  return cursorY;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The QR image could not be created.'))),
      'image/png',
    ),
  );
}

export async function downloadStaticQrPng(
  qrSource: string,
  metadata: StaticQrPosterMetadata,
): Promise<void> {
  const qr = await loadImage(qrSource);
  const logo = metadata.logoUrl
    ? await loadImage(metadata.logoUrl, true).catch(() => undefined)
    : undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 1_200;
  canvas.height = 1_600;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare the QR image.');

  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0B2638';
  context.fillRect(0, 0, canvas.width, 230);
  context.fillStyle = '#FFFFFF';
  context.font = '700 56px Arial, sans-serif';
  context.textAlign = 'left';
  context.fillText('ATTENDITY', 90, 100);
  if (logo) context.drawImage(logo, 990, 48, 120, 120);
  context.fillStyle = '#D4AA48';
  context.font = '700 28px Arial, sans-serif';
  context.fillText('STATIC CLASS ATTENDANCE QR', 90, 160);
  context.fillStyle = '#DCE8E2';
  context.font = '400 25px Arial, sans-serif';
  wrapText(context, metadata.institution, 90, 202, 1_020, 31);

  context.textAlign = 'center';
  context.fillStyle = '#17201A';
  context.font = '700 42px Arial, sans-serif';
  const courseEnd = wrapText(context, metadata.course, 600, 305, 1_000, 52);
  context.fillStyle = '#5F6F65';
  context.font = '400 27px Arial, sans-serif';
  context.fillText(`Lecturer: ${metadata.lecturer}`, 600, courseEnd + 55);

  context.fillStyle = '#FFFFFF';
  context.strokeStyle = '#C7D8CF';
  context.lineWidth = 4;
  context.fillRect(260, 430, 680, 680);
  context.strokeRect(260, 430, 680, 680);
  context.drawImage(qr, 300, 470, 600, 600);

  context.fillStyle = '#EAF5EF';
  context.fillRect(100, 1160, 1_000, 210);
  context.fillStyle = '#14532D';
  context.font = '700 25px Arial, sans-serif';
  context.fillText('CHECK-IN WINDOW', 600, 1212);
  context.fillStyle = '#17201A';
  context.font = '700 31px Arial, sans-serif';
  wrapText(context, metadata.checkInWindow, 600, 1270, 900, 40);
  context.fillStyle = '#5F6F65';
  context.font = '400 22px Arial, sans-serif';
  context.fillText('This code expires automatically when the check-in window closes.', 600, 1340);

  context.fillStyle = '#0B2638';
  context.font = '700 24px Arial, sans-serif';
  context.fillText('Scan with the Attendity student attendance scanner.', 600, 1455);
  context.fillStyle = '#5F6F65';
  context.font = '400 19px Arial, sans-serif';
  context.fillText('Registration and configured verification checks remain active.', 600, 1495);

  const blob = await canvasBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `attendity-${fileSlug(metadata.course) || 'class'}-attendance-qr.png`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function escaped(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function printStaticQr(qrSource: string, metadata: StaticQrPosterMetadata): void {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) throw new Error('Allow pop-ups to print the static QR code.');
  printWindow.document.write(`<!doctype html><html><head><title>Attendity static QR</title><style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17201a; font-family: Arial, sans-serif; }
    header { background: #0b2638; color: white; padding: 28px; }
    header strong { display: block; font-size: 28px; }
    header span { color: #d4aa48; font-size: 13px; font-weight: 700; letter-spacing: .1em; }
    main { padding: 30px; text-align: center; }
    h1 { font-size: 24px; margin: 0; }
    .lecturer { color: #5f6f65; }
    header { position: relative; min-height: 108px; padding-right: 120px; }
    .brand { position: absolute; right: 28px; top: 22px; width: 72px; height: 72px; object-fit: contain; background: white; border-radius: 12px; padding: 5px; }
    img.qr { width: 380px; max-width: 80%; margin: 24px auto; border: 12px solid white; }
    .window { background: #eaf5ef; border: 1px solid #c7d8cf; padding: 18px; }
    .window strong { color: #14532d; display: block; margin-bottom: 8px; }
    footer { color: #5f6f65; font-size: 11px; margin-top: 24px; }
  </style></head><body><header>${metadata.logoUrl ? `<img class="brand" alt="${escaped(metadata.institution)} logo" src="${escaped(metadata.logoUrl)}" />` : ''}<strong>ATTENDITY</strong><span>STATIC CLASS ATTENDANCE QR</span><p>${escaped(metadata.institution)}</p></header><main><h1>${escaped(metadata.course)}</h1><p class="lecturer">Lecturer: ${escaped(metadata.lecturer)}</p><img class="qr" alt="Static attendance QR code" src="${qrSource}" /><section class="window"><strong>CHECK-IN WINDOW</strong>${escaped(metadata.checkInWindow)}<p>This code expires automatically when the check-in window closes.</p></section><footer>Scan with the Attendity student attendance scanner. Server validation is required for every scan.</footer></main></body></html>`);
  printWindow.document.close();
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  });
}
