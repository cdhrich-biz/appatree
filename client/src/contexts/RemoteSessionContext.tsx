// 원격 가족 지원 세션 전역 상태.
// - 부모 기기: user:<myId> 채널에서 session:request 수신 → IncomingSessionDialog 트리거
// - 활성 세션: session:<key> 채널 subscribe/publish, 종료 시 정리
// - 자녀 기기: /remote/:sessionKey 진입 시 `registerChildSession`으로 활성 세션 등록

import * as Ably from "ably";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";
import { useAblyClient } from "@/hooks/useAblyClient";
import {
  channelForSession,
  channelForUser,
  type SessionChannelEvent,
  type SessionRequestEvent,
} from "@shared/remoteEvents";
import { usePreferences } from "@/contexts/PreferencesContext";

const AUTO_REJECT_MS = 45 * 1000;

export type SessionRole = "parent" | "child";

export interface PendingRequest {
  sessionKey: string;
  childUserId: number;
  childName: string | null;
  requestedAt: number;
}

export interface ActiveSession {
  sessionKey: string;
  role: SessionRole;
  parentUserId: number;
  childUserId: number;
  counterpartName: string | null;
  acceptedAt: number;
}

interface RemoteSessionContextValue {
  myUserId: number | null;
  ablyState: "idle" | "connecting" | "connected" | "disconnected" | "failed";
  pendingRequest: PendingRequest | null;
  activeSession: ActiveSession | null;
  acceptIncoming: (sessionKey: string) => Promise<void>;
  rejectIncoming: (sessionKey: string) => Promise<void>;
  endActive: (reason?: string) => Promise<void>;
  /** 자녀 측이 requestSession 성공 후 호출해 활성 세션 진입 */
  registerChildSession: (payload: {
    sessionKey: string;
    parentUserId: number;
    childUserId: number;
    counterpartName: string | null;
  }) => void;
  /** 세션 이벤트 채널에 메시지 publish (활성 세션 중에만 동작) */
  publish: (event: SessionChannelEvent) => Promise<void>;
  /** 세션 이벤트 채널 listener 등록. 반환값은 unsubscribe */
  subscribe: (listener: (event: SessionChannelEvent) => void) => () => void;
}

const RemoteSessionContext = createContext<RemoteSessionContextValue | undefined>(undefined);

export function RemoteSessionProvider({ children }: { children: ReactNode }) {
  const { speak } = usePreferences();
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const myUserId = meQuery.data?.id ?? null;

  const { client: ably, state: ablyState } = useAblyClient(myUserId);

  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const sessionChannelRef = useRef<Ably.RealtimeChannel | null>(null);
  const autoRejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribersRef = useRef<Set<(e: SessionChannelEvent) => void>>(new Set());

  const acceptSessionMutation = trpc.remote.acceptSession.useMutation();
  const rejectSessionMutation = trpc.remote.rejectSession.useMutation();
  const endSessionMutation = trpc.remote.endSession.useMutation();

  // ────────── 부모 전용: user 채널 구독 (요청 수신) ──────────
  useEffect(() => {
    if (!ably || !myUserId || ablyState !== "connected") return;

    const userChannel = ably.channels.get(channelForUser(myUserId));
    const onRequest = (msg: Ably.Message) => {
      const data = msg.data as SessionRequestEvent;
      if (!data || data.type !== "session:request") return;
      if (activeSession) {
        rejectSessionMutation.mutate({ sessionKey: data.sessionKey, reason: "busy" });
        return;
      }
      setPendingRequest({
        sessionKey: data.sessionKey,
        childUserId: data.childUserId,
        childName: data.childName,
        requestedAt: data.requestedAt,
      });
      try {
        speak(`${data.childName ?? "자녀"}가 도와주려고 해요. 수락하려면 왼쪽 초록 버튼을 누르세요.`);
      } catch {
        // speechSynthesis 미지원 환경 무시
      }
      if (autoRejectTimerRef.current) clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = setTimeout(() => {
        setPendingRequest((current) => {
          if (current && current.sessionKey === data.sessionKey) {
            rejectSessionMutation.mutate({ sessionKey: data.sessionKey, reason: "timeout" });
            return null;
          }
          return current;
        });
      }, AUTO_REJECT_MS);
    };

    userChannel.subscribe("session:request", onRequest);
    return () => {
      userChannel.unsubscribe("session:request", onRequest);
    };
  }, [ably, myUserId, ablyState, activeSession, rejectSessionMutation, speak]);

  // ────────── 활성 세션 채널 attach/detach ──────────
  useEffect(() => {
    if (!ably || !activeSession || ablyState !== "connected") {
      const current = sessionChannelRef.current;
      if (current) {
        try {
          current.unsubscribe();
        } catch {
          // ignore
        }
        sessionChannelRef.current = null;
      }
      return;
    }

    const channel = ably.channels.get(channelForSession(activeSession.sessionKey));
    sessionChannelRef.current = channel;

    const onAnyMessage = (msg: Ably.Message) => {
      const data = msg.data as SessionChannelEvent | undefined;
      if (!data || typeof data !== "object") return;
      if (data.type === "session:ended") {
        setActiveSession(null);
      }
      subscribersRef.current.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.warn("[remote] subscriber error", err);
        }
      });
    };

    channel.subscribe(onAnyMessage);
    return () => {
      channel.unsubscribe(onAnyMessage);
    };
  }, [ably, activeSession, ablyState]);

  useEffect(() => {
    if (pendingRequest === null && autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = null;
    }
  }, [pendingRequest]);

  const acceptIncoming = useCallback(
    async (sessionKey: string) => {
      if (!myUserId) return;
      try {
        const res = await acceptSessionMutation.mutateAsync({ sessionKey });
        setPendingRequest((current) => (current?.sessionKey === sessionKey ? null : current));
        setActiveSession({
          sessionKey,
          role: "parent",
          parentUserId: res.session.parentUserId,
          childUserId: res.session.childUserId,
          counterpartName: null,
          acceptedAt: Date.now(),
        });
        try {
          speak("도와주기를 시작했어요.");
        } catch {
          // noop
        }
      } catch (err) {
        console.warn("[remote] acceptIncoming failed", err);
      }
    },
    [myUserId, acceptSessionMutation, speak],
  );

  const rejectIncoming = useCallback(
    async (sessionKey: string) => {
      try {
        await rejectSessionMutation.mutateAsync({ sessionKey });
      } finally {
        setPendingRequest((current) => (current?.sessionKey === sessionKey ? null : current));
      }
    },
    [rejectSessionMutation],
  );

  const endActive = useCallback(
    async (reason = "user_ended") => {
      if (!activeSession) return;
      const wasParent = activeSession.role === "parent";
      try {
        await endSessionMutation.mutateAsync({ sessionKey: activeSession.sessionKey, reason });
      } finally {
        setActiveSession(null);
        if (wasParent) {
          try {
            speak("도와주기가 끝났어요.");
          } catch {
            // noop
          }
        }
      }
    },
    [activeSession, endSessionMutation, speak],
  );

  const registerChildSession = useCallback<RemoteSessionContextValue["registerChildSession"]>(
    (payload) => {
      setActiveSession({
        ...payload,
        role: "child",
        acceptedAt: Date.now(),
      });
    },
    [],
  );

  const publish = useCallback(async (event: SessionChannelEvent) => {
    const channel = sessionChannelRef.current;
    if (!channel) return;
    try {
      await channel.publish(event.type, event);
    } catch (err) {
      console.warn("[remote] publish failed", err);
    }
  }, []);

  const subscribe = useCallback((listener: (event: SessionChannelEvent) => void) => {
    subscribersRef.current.add(listener);
    return () => {
      subscribersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<RemoteSessionContextValue>(
    () => ({
      myUserId,
      ablyState,
      pendingRequest,
      activeSession,
      acceptIncoming,
      rejectIncoming,
      endActive,
      registerChildSession,
      publish,
      subscribe,
    }),
    [
      myUserId,
      ablyState,
      pendingRequest,
      activeSession,
      acceptIncoming,
      rejectIncoming,
      endActive,
      registerChildSession,
      publish,
      subscribe,
    ],
  );

  return <RemoteSessionContext.Provider value={value}>{children}</RemoteSessionContext.Provider>;
}

export function useRemoteSession() {
  const ctx = useContext(RemoteSessionContext);
  if (!ctx) throw new Error("useRemoteSession must be used within RemoteSessionProvider");
  return ctx;
}
