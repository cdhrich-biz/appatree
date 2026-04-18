import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";

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

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
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
