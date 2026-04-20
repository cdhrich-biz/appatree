// 부모 기기에서만 동작. 활성 세션 중 session 채널의 action:* 이벤트를 받아
// 허용된 것만 실행하고, 현재 화면 상태를 자녀에게 state:sync로 브로드캐스트한다.
//
// - 허용되지 않은 경로/행동은 action:blocked로 응답
// - navigate/search/speak만 우선 지원 (play/pause/seek는 Sprint 4에서 플레이어 통합 후 추가)
// - 모든 실행은 부모 기기 내부에서 일어나므로 보안 경계 유지

import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import {
  isNavigatePathAllowed,
  type SessionChannelEvent,
} from "@shared/remoteEvents";
import { toast } from "sonner";

export default function ParentActionExecutor() {
  const { activeSession, subscribe, publish } = useRemoteSession();
  const [location, navigate] = useLocation();
  const { speak } = usePreferences();
  const logActionMutation = trpc.remote.logAction.useMutation();

  // 자녀 → 부모 action 처리
  useEffect(() => {
    if (!activeSession || activeSession.role !== "parent") return;
    const sessionKey = activeSession.sessionKey;

    const off = subscribe((event: SessionChannelEvent) => {
      if (!event.type.startsWith("action:")) return;

      switch (event.type) {
        case "action:navigate": {
          if (!isNavigatePathAllowed(event.path)) {
            publish({
              type: "action:blocked",
              reason: "허용되지 않은 경로",
              attemptedType: event.type,
            });
            return;
          }
          navigate(event.path);
          toast.info(`자녀가 ${event.path} 화면을 열었어요`, { id: "remote-navigate" });
          logActionMutation.mutate({
            sessionKey,
            actionType: "navigate",
            payload: { path: event.path },
          });
          break;
        }
        case "action:search": {
          const target = `/search?q=${encodeURIComponent(event.query)}`;
          navigate(target);
          toast.info(`자녀가 "${event.query}" 검색을 도와드려요`, { id: "remote-search" });
          logActionMutation.mutate({
            sessionKey,
            actionType: "search",
            payload: { query: event.query },
          });
          break;
        }
        case "action:speak": {
          try {
            speak(event.message);
          } catch {
            // speechSynthesis 미지원 환경 무시
          }
          toast.info("자녀가 음성 안내를 전했어요", { id: "remote-speak" });
          logActionMutation.mutate({
            sessionKey,
            actionType: "speak",
            payload: { message: event.message },
          });
          break;
        }
        case "action:highlight": {
          // Sprint 4의 HighlightOverlay가 구현될 때까지 placeholder
          logActionMutation.mutate({
            sessionKey,
            actionType: "highlight",
            payload: { selector: event.selector },
          });
          break;
        }
        default:
          // play/pause/seek/bookmark/pref_update 등은 Sprint 4 이후 통합
          publish({
            type: "action:blocked",
            reason: "아직 지원되지 않는 기능",
            attemptedType: event.type,
          });
          break;
      }
    });
    return off;
  }, [activeSession, subscribe, publish, navigate, speak, logActionMutation]);

  // 부모 기기의 현재 화면 상태를 자녀에게 브로드캐스트 (route 단위)
  useEffect(() => {
    if (!activeSession || activeSession.role !== "parent") return;
    const path = location.split("?")[0] || "/";
    const qs = location.includes("?") ? location.slice(location.indexOf("?")) : "";
    void publish({
      type: "state:sync",
      route: path,
      queryString: qs,
      player: null,
      scroll: { x: 0, y: 0 },
      timestamp: Date.now(),
    });
  }, [activeSession, location, publish]);

  return null;
}
