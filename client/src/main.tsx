import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";

import "./index.css";

// ----------------------------------------------------------------------------
// Service Worker: 설치 가능(installable) 전용 최소 SW (/sw-v2.js).
// - 과거 구 SW(/sw.js)는 스테일 캐시로 크래시를 유발 → kill-switch로 정리됨
// - sw-v2.js 는 "캐싱을 하지 않는" 최소 SW. PWA "홈 화면에 추가" 자동 안내
//   (Chromium 계열 beforeinstallprompt)의 전제 조건(활성 fetch 핸들러)만 충족
// - 구 sw.js 를 받은 사용자는 SW_KILL_RELOAD 신호로 1회 리로드 후 sw-v2로 교체됨
// ----------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  // 과거 kill-switch SW가 보내는 리로드 신호 수신 (구 사용자 호환)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_KILL_RELOAD') {
      window.location.reload();
    }
  });
  // 설치 가능 조건 충족용 최소 SW 등록 (캐싱 없음 — sw-v2.js 주석 참고)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-v2.js').catch(() => { /* ignore */ });
  });
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

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Query Error]", event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
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
