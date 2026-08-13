import { Button, Card, CardHeader } from '@qr/ui';
import { Camera, CameraOff, ShieldCheck } from 'lucide-react';
import { useRef, useState, type ComponentType, type RefAttributes } from 'react';
import * as WebcamPackage from 'react-webcam';

interface WebcamHandle {
  getScreenshot: () => string | null;
}

interface WebcamProps extends RefAttributes<WebcamHandle> {
  readonly audio: boolean;
  readonly className: string;
  readonly forceScreenshotSourceSize: boolean;
  readonly onUserMediaError: () => void;
  readonly screenshotFormat: 'image/jpeg';
  readonly screenshotQuality: number;
  readonly videoConstraints: MediaTrackConstraints;
}

const Webcam = WebcamPackage.default as unknown as ComponentType<WebcamProps>;

interface FaceCaptureProps {
  readonly busy?: boolean;
  readonly description: string;
  readonly onCapture: (imageCapture: string) => void;
  readonly title: string;
}

export function FaceCapture({ busy = false, description, onCapture, title }: FaceCaptureProps) {
  const webcam = useRef<WebcamHandle>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const capture = () => {
    const image = webcam.current?.getScreenshot();
    if (!image) {
      setCameraError('A clear camera frame could not be captured. Please try again.');
      return;
    }
    setCameraError('');
    onCapture(image);
  };

  return (
    <Card className="p-5" tone="teal">
      <CardHeader description={description} icon={<Camera size={20} />} title={title} tone="teal" />
      {!cameraActive ? (
        <div className="mt-4 max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <div className="flex gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
            <p>
              Attendity will request camera permission only after you choose Start camera. The
              captured frame is sent securely for this verification and is not stored in your
              browser.
            </p>
          </div>
          <Button
            className="mt-4 min-h-11"
            disabled={busy}
            onClick={() => {
              setCameraError('');
              setCameraActive(true);
            }}
          >
            <Camera aria-hidden="true" size={18} />
            Start camera
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 max-w-lg overflow-hidden rounded-2xl bg-slate-950">
            <Webcam
              audio={false}
              className="aspect-video w-full object-cover"
              forceScreenshotSourceSize
              onUserMediaError={() =>
                setCameraError(
                  'Camera access was not available. Check your browser permission and try again.',
                )
              }
              ref={webcam}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.82}
              videoConstraints={{ facingMode: 'user', width: 720, height: 540 }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={busy} onClick={capture}>
              <Camera aria-hidden="true" size={18} />
              Capture securely
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setCameraActive(false);
                setCameraError('');
              }}
              variant="secondary"
            >
              <CameraOff aria-hidden="true" size={18} />
              Stop camera
            </Button>
          </div>
        </>
      )}
      {cameraError ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {cameraError}
        </p>
      ) : null}
    </Card>
  );
}
