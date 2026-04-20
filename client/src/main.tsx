import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getCurrentAccessToken } from "./contexts/AuthContext";

import "./index.css";

// ----------------------------------------------------------------------------
// Service Worker: 현재 비활성화.
// - 기존 구 SW가 스테일 index.html / 구 CSP를 캐시해 프로덕션 크래시 유발
// - /sw.js 는 kill-switch (자신 + 모든 캐시 삭제, SW_KILL_RELOAD 메시지 송신)
// - 기존 사용자는 브라우저 자동 업데이트로 새 sw.js 받아 정리됨
// - 여기서는 새 등록을 하지 않고, kill 메시지만 받아 자동 리로드 처리
// ----------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  // 과거 등록된 SW가 살아있으면 리로드 신호 수신 후 갱신
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_KILL_RELOAD') {
      window.location.reload();
    }
  });
  // 혹시 남아있는 기존 등록 전부 언레지스터 (방어적 정리)
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => { /* ignore */ });
}

// ----------------------------------------------------------------------------
// 스테일 청크 자동 복구
// 사용자 브라우저가 배포 이전의 index.html을 캐시해 두면 lazy import 된
// 청크 해시가 더 이상 존재하지 않아 404. 이 경우 1회 자동 리로드로 최신
// index.html 을 받아 복구한다. sessionStorage 플래그로 무한 리로드 방지.
// ----------------------------------------------------------------------------
const RELOAD_FLAG = 'appatree.stale-chunk-reload';

function reloadForStaleChunks() {
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  window.location.reload();
}

// Vite 의 동적 import 프리로드 실패 이벤트
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForStaleChunks();
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { message?: string; name?: string } | undefined;
  const msg = reason?.message ?? '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Importing a module script failed')
  ) {
    reloadForStaleChunks();
  }
});

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // /login, /auth/callback 에서는 이미 로그인 흐름 중이니 루프를 막는다
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/auth/")) return;

  window.location.href = "/login";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const token = getCurrentAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
