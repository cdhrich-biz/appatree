// Ably 클라이언트 싱글톤 훅.
// - 서버 tRPC에서 받은 토큰으로 연결 인증 (API key를 브라우저에 노출하지 않음)
// - user 채널과 세션 채널을 일관된 방식으로 구독/발행
// - 탭이 여러 개 열려도 한 Realtime 인스턴스만 유지

import * as Ably from "ably";
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

let sharedClient: Ably.Realtime | null = null;
let sharedClientUserId: number | null = null;

function disposeSharedClient() {
  if (sharedClient) {
    try {
      sharedClient.close();
    } catch {
      // ignore
    }
  }
  sharedClient = null;
  sharedClientUserId = null;
}

export function useAblyClient(userId: number | null) {
  const [state, setState] = useState<ConnectionState>(userId ? "connecting" : "idle");
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const utils = trpc.useUtils();
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    if (userId === null) {
      setState("idle");
      setClient(null);
      return;
    }

    // 동일 유저로 이미 만든 클라이언트가 있으면 재사용
    if (sharedClient && sharedClientUserId === userId) {
      setClient(sharedClient);
      setState(mapAblyState(sharedClient.connection.state));
      return;
    }

    // 유저가 바뀌었으면 기존 클라이언트 정리
    if (sharedClient && sharedClientUserId !== userId) {
      disposeSharedClient();
    }

    const realtime = new Ably.Realtime({
      authCallback: (_tokenParams, cb) => {
        utils.remote.getUserChannelToken
          .fetch()
          .then((tokenRequest) => cb(null, tokenRequest as Ably.TokenRequest))
          .catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            cb(message, null);
          });
      },
      clientId: String(userId),
      autoConnect: true,
      echoMessages: false,
      transportParams: { remainPresentFor: 10000 },
    });

    sharedClient = realtime;
    sharedClientUserId = userId;
    setClient(realtime);

    const onStateChange = (change: Ably.ConnectionStateChange) => {
      if (disposedRef.current) return;
      setState(mapAblyState(change.current));
    };
    realtime.connection.on(onStateChange);
    setState(mapAblyState(realtime.connection.state));

    return () => {
      disposedRef.current = true;
      realtime.connection.off(onStateChange);
      // 공유 인스턴스는 다른 훅이 쓰고 있을 수 있으니 바로 close하지 않음
      // 로그아웃 등 userId가 null로 바뀌는 시점에만 명시적으로 dispose
    };
  }, [userId, utils]);

  return useMemo(() => ({ client, state }), [client, state]);
}

function mapAblyState(s: Ably.ConnectionState): ConnectionState {
  switch (s) {
    case "initialized":
    case "connecting":
      return "connecting";
    case "connected":
      return "connected";
    case "disconnected":
    case "suspended":
    case "closing":
    case "closed":
      return "disconnected";
    case "failed":
      return "failed";
    default:
      return "idle";
  }
}

export function closeAblyClient() {
  disposeSharedClient();
}
