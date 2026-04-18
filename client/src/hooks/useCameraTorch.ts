import { useCallback, useEffect, useRef, useState } from 'react';

interface TorchConstraint { torch: boolean }
interface TorchCapabilities { torch?: boolean }

type TrackWithTorch = MediaStreamTrack & {
  getCapabilities?: () => TorchCapabilities;
};

interface UseCameraTorchResult {
  isOn: boolean;
  isSupported: boolean | null;
  error: string | null;
  toggle: () => Promise<void>;
  stop: () => void;
}

export function useCameraTorch(): UseCameraTorchResult {
  const [isOn, setIsOn] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsOn(false);
  }, []);

  const toggle = useCallback(async () => {
    setError(null);
    if (isOn) {
      stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false);
      setError('이 브라우저는 카메라를 지원하지 않습니다');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      const track = stream.getVideoTracks()[0] as TrackWithTorch;
      const capabilities = (track.getCapabilities?.() ?? {}) as TorchCapabilities;

      if (!capabilities.torch) {
        stream.getTracks().forEach((t) => t.stop());
        setIsSupported(false);
        setError('이 기기는 후레쉬를 지원하지 않습니다');
        return;
      }

      await track.applyConstraints({
        advanced: [{ torch: true } as unknown as MediaTrackConstraintSet & TorchConstraint],
      });

      streamRef.current = stream;
      setIsSupported(true);
      setIsOn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '카메라 접근 실패');
      setIsSupported(false);
    }
  }, [isOn, stop]);

  useEffect(() => () => stop(), [stop]);

  return { isOn, isSupported, error, toggle, stop };
}
