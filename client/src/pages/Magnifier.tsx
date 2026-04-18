import { useEffect, useRef, useState } from 'react';
import { Flashlight, Search as MagIcon } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';

interface TorchCapabilities { torch?: boolean; zoom?: { min: number; max: number; step: number } }
type TrackAdv = MediaStreamTrack & {
  getCapabilities?: () => TorchCapabilities;
};

const ZOOM_LEVELS = [1, 2, 3, 5] as const;

export default function Magnifier() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [nativeZoomRange, setNativeZoomRange] = useState<{ min: number; max: number } | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('이 브라우저는 카메라를 지원하지 않습니다');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0] as TrackAdv;
        const caps = (track.getCapabilities?.() ?? {}) as TorchCapabilities;
        setTorchSupported(!!caps.torch);
        if (caps.zoom && caps.zoom.max > 1) {
          setNativeZoomRange({ min: caps.zoom.min, max: caps.zoom.max });
        }
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '카메라 권한을 허용해주세요');
      }
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const applyZoom = async (level: number) => {
    setZoom(level);
    const track = streamRef.current?.getVideoTracks()[0] as TrackAdv | undefined;
    if (!track || !nativeZoomRange) return;
    const target = Math.min(
      nativeZoomRange.max,
      Math.max(nativeZoomRange.min, level),
    );
    try {
      await track.applyConstraints({
        advanced: [{ zoom: target } as unknown as MediaTrackConstraintSet],
      });
    } catch {
      /* CSS fallback 사용 */
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0] as TrackAdv | undefined;
    if (!track || !torchSupported) {
      toast.error('이 기기는 후레쉬를 지원하지 않습니다');
      return;
    }
    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      toast.error('후레쉬를 켤 수 없습니다');
    }
  };

  const usesCssZoom = !nativeZoomRange;

  return (
    <AppShell title="돋보기" subtitle="크게 보고 읽기" showBack hideBottomNav>
      {error ? (
        <div className="text-center py-16">
          <MagIcon size={56} className="mx-auto text-gray-400 mb-4" />
          <p className="text-senior-heading text-gray-700 mb-2">카메라를 열 수 없습니다</p>
          <p className="text-senior-body text-gray-600 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <div
            className="relative bg-black rounded-3xl overflow-hidden mb-4 border-2 border-[color:var(--app-border)]"
            style={{ aspectRatio: '3/4' }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
              style={usesCssZoom ? { transform: `scale(${zoom})`, transformOrigin: 'center' } : undefined}
              aria-label="돋보기 영상"
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-senior-body">
                카메라 준비 중...
              </div>
            )}
          </div>

          <div className="card-senior mb-3">
            <p className="text-senior-body text-gray-700 mb-3">
              확대 배율 <span className="font-bold ml-1">{zoom}x</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ZOOM_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => applyZoom(level)}
                  className="btn-secondary"
                  data-active={zoom === level}
                  aria-label={`${level}배 확대`}
                >
                  {level}x
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={toggleTorch}
            disabled={!torchSupported}
            className="w-full flex items-center justify-center gap-3 rounded-2xl p-4 transition-all disabled:opacity-50"
            style={
              torchOn
                ? { backgroundColor: '#fef3c7', border: '2px solid #f59e0b' }
                : { backgroundColor: '#fff', border: '2px solid var(--app-border)' }
            }
            aria-label={torchOn ? '후레쉬 끄기' : '후레쉬 켜기'}
            aria-pressed={torchOn}
          >
            <Flashlight
              size={28}
              className={torchOn ? 'text-amber-600' : 'text-gray-700'}
              fill={torchOn ? 'currentColor' : 'none'}
            />
            <span className="text-senior-button">
              후레쉬 {torchOn ? '끄기' : '켜기'}
              {!torchSupported && ' (미지원)'}
            </span>
          </button>
        </>
      )}
    </AppShell>
  );
}
