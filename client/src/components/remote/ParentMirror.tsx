// 자녀 기기에서 부모 앱의 현재 화면을 실시간으로 미러링하는 컴포넌트.
// 브라우저 getDisplayMedia 대신 "동일 도메인 iframe + observer 쿼리 파라미터" 방식.
// - 부모가 보고 있는 route가 state:sync로 오면 iframe을 해당 route로 navigate
// - iframe 내부는 ?observer=1 쿼리로 진입 → observer 모드 스타일 적용, 포인터 이벤트 차단
// - 실제 픽셀 공유가 아닌 "앱 상태 재현"이므로 모바일 Safari에서도 동작, 대역폭 최소

import { useEffect, useRef, useState } from "react";
import { EyeOff, MousePointer2, RefreshCw } from "lucide-react";
import type { PlayerSnapshot } from "@shared/remoteEvents";
import { computeStableSelector } from "@/lib/remoteSelector";

interface ParentMirrorProps {
  route: string | null;
  queryString?: string;
  player?: PlayerSnapshot;
  pointingEnabled?: boolean;
  onPick?: (selector: string, label: string | null) => void;
}

export default function ParentMirror({ route, queryString, pointingEnabled = false, onPick }: ParentMirrorProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  // route 변경 시 iframe의 contentWindow를 해당 경로로 이동
  useEffect(() => {
    if (!route || !iframeRef.current) return;
    const path = route.startsWith("/") ? route : `/${route}`;
    const qs = queryString ?? "";
    const targetUrl = `${path}${qs}${qs.includes("?") ? "&" : "?"}observer=1`;
    try {
      // 동일 출처이므로 location.replace 가능
      const win = iframeRef.current.contentWindow;
      if (win) {
        win.location.replace(targetUrl);
      } else {
        iframeRef.current.src = targetUrl;
      }
    } catch {
      // cross-origin 문제 발생 시 src 재설정으로 fallback
      iframeRef.current.src = targetUrl;
    }
  }, [route, queryString]);

  const handleReload = () => {
    if (!iframeRef.current) return;
    setLoadError(false);
    iframeRef.current.src = iframeRef.current.src;
  };

  // 포인팅 모드: 오버레이 클릭 좌표 → iframe document의 실제 요소 → selector 계산
  const handlePick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pointingEnabled || !onPick || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const rect = iframe.getBoundingClientRect();
    const xInIframe = e.clientX - rect.left;
    const yInIframe = e.clientY - rect.top;
    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch {
      doc = null;
    }
    if (!doc) return;
    // 뷰포트 스케일을 고려 — iframe 내용은 실제 렌더 크기와 CSS 크기가 다를 수 있음
    const scaleX = (iframe.contentWindow?.innerWidth ?? rect.width) / rect.width;
    const scaleY = (iframe.contentWindow?.innerHeight ?? rect.height) / rect.height;
    const element = doc.elementFromPoint(xInIframe * scaleX, yInIframe * scaleY);
    if (!element) return;
    const selector = computeStableSelector(element);
    if (!selector) return;
    const label = element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 30) || null;
    onPick(selector, label);
  };

  if (!route) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <EyeOff size={48} className="text-gray-400 mx-auto mb-3" aria-hidden />
        <p className="text-senior-body text-gray-500">
          부모님 화면 상태를 아직 받지 못했어요.
        </p>
        <p className="text-sm text-gray-400 mt-1">부모님 기기에서 수락하면 화면이 나타나요.</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl overflow-hidden border-2 border-green-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-green-50 border-b border-green-100">
        <span className="text-sm font-semibold text-green-800">부모님 화면 · {route}</span>
        <div className="flex items-center gap-2">
          {pointingEnabled && (
            <span className="flex items-center gap-1 text-xs text-amber-700 px-2 py-1 rounded bg-amber-100">
              <MousePointer2 size={14} />
              여기 누르세요 지목 모드
            </span>
          )}
          <button
            onClick={handleReload}
            className="flex items-center gap-1 text-xs text-green-700 px-2 py-1 rounded hover:bg-green-100"
            aria-label="미러 새로고침"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>
      <div
        className="relative"
        style={{ aspectRatio: "9 / 16", maxHeight: "60vh", background: "#fff" }}
      >
        <iframe
          ref={iframeRef}
          title="부모님 앱 미러"
          sandbox="allow-same-origin allow-scripts"
          className="absolute inset-0 w-full h-full"
          onError={() => setLoadError(true)}
        />
        {/* 포인팅 모드에서는 클릭으로 selector 전송, 아닐 때는 단순 인터랙션 차단 */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            pointerEvents: "auto",
            background: "transparent",
            cursor: pointingEnabled ? "crosshair" : "default",
          }}
          onClick={pointingEnabled ? handlePick : undefined}
        />
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 p-6 text-center">
            <p className="text-senior-body text-red-600 mb-3">미러를 불러오지 못했어요</p>
            <button onClick={handleReload} className="btn-secondary">
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
