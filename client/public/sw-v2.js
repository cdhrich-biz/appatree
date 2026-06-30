// ============================================================================
// Service Worker v2 — INSTALLABILITY-ONLY (no caching)
// ----------------------------------------------------------------------------
// 목적: PWA "홈 화면에 추가" 자동 안내(Chromium 계열 beforeinstallprompt)는
//       manifest 외에 "fetch 핸들러를 가진 활성 Service Worker"를 사실상 요구한다.
//       과거 구 SW가 스테일 캐시로 프로덕션 크래시를 유발했던 이력 때문에,
//       이 SW는 "절대 캐싱하지 않는다". fetch 핸들러는 존재하되 respondWith를
//       호출하지 않아 브라우저가 모든 요청을 네이티브로 처리한다(개입 0).
// ============================================================================

self.addEventListener('install', () => {
  // 즉시 활성화 — 사용자가 한 번 더 방문하지 않아도 설치 가능 상태로 전환
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 과거 SW가 남긴 캐시가 있으면 1회 정리 (스테일 자산 방지)
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      await self.clients.claim();
    })(),
  );
});

// fetch 핸들러는 "존재"만 하면 설치 가능 휴리스틱을 충족한다.
// respondWith를 호출하지 않으므로 모든 요청은 브라우저 기본 동작으로 처리되고
// 어떤 응답도 캐시하지 않는다.
self.addEventListener('fetch', () => {
  // intentionally no-op (pass-through to network)
});
