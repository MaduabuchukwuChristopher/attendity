import { Skeleton } from '@qr/ui';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function CheckInQr({
  value,
  label = 'Live encrypted attendance QR code',
  onReady,
}: {
  readonly value: string;
  readonly label?: string;
  readonly onReady?: (dataUrl: string) => void;
}) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, { width: 512, margin: 4, errorCorrectionLevel: 'M' }).then(
      (image) => {
        if (active) {
          setSource(image);
          onReady?.(image);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [onReady, value]);
  return source ? (
    <img
      alt={label}
      className="mx-auto aspect-square w-full max-w-96 rounded-2xl border-8 border-white bg-white shadow-sm"
      src={source}
    />
  ) : (
    <Skeleton className="mx-auto size-60" />
  );
}
