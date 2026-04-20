// 부모 기기에서 자녀가 action:highlight 이벤트로 지정한 요소에 밝은 테두리를 그려준다.
// "여기 누르세요" 안내용. 요소는 DOM selector로 찾고, ttlMs 후 자동 제거.

import { useEffect, useState } from "react";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";

interface HighlightBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  expiresAt: number;
}

export default function HighlightOverlay() {
  const { activeSession, subscribe } = useRemoteSession();
  const [boxes, setBoxes] = useState<HighlightBox[]>([]);

  // 자녀→부모 action:highlight 수신
  useEffect(() => {
    if (!activeSession || activeSession.role !== "parent") return;
    const off = subscribe((event) => {
      if (event.type !== "action:highlight") return;
      const target = document.querySelector(event.selector);
      if (!target) return;
      const rect = (target as HTMLElement).getBoundingClientRect();
      const id = Date.now() + Math.random();
      const ttl = event.ttlMs ?? 5000;
      setBoxes((current) => [
        ...current,
        {
          id,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          expiresAt: Date.now() + ttl,
        },
      ]);
      try {
        (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // ignore
      }
    });
    return off;
  }, [activeSession, subscribe]);

  // 만료된 박스 정리
  useEffect(() => {
    if (boxes.length === 0) return;
    const iv = setInterval(() => {
      setBoxes((current) => current.filter((b) => b.expiresAt > Date.now()));
    }, 300);
    return () => clearInterval(iv);
  }, [boxes.length]);

  if (!activeSession || activeSession.role !== "parent" || boxes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[45] pointer-events-none" aria-hidden>
      {boxes.map((box) => (
        <div
          key={box.id}
          className="absolute rounded-2xl"
          style={{
            left: box.x - 8,
            top: box.y - 8,
            width: box.width + 16,
            height: box.height + 16,
            border: "4px solid #f59e0b",
            boxShadow: "0 0 0 6px rgba(245,158,11,0.35), 0 0 32px 8px rgba(245,158,11,0.45)",
            animation: "remote-highlight-pulse 1.2s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes remote-highlight-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
