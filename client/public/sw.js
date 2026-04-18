// ============================================================================
// Service Worker - KILL SWITCH
// ----------------------------------------------------------------------------
// 이전 버전 SW가 구 CSP/구 index.html을 캐시해 프로덕션에서 MIME·CSP 크래시
// 유발. 안전하게 모든 SW를 언레지스터하고 모든 캐시를 삭제한 뒤 스스로를
// 제거한다. main.tsx 에서 SW 등록은 이미 해제된 상태.
// 나중에 PWA 캐싱이 필요해지면 완전히 새 경로(/sw-v2.js 등)로 재도입 권장.
// ============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1) 모든 캐시 삭제
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // 2) 모든 클라이언트 제어권 가져오기
      await self.clients.claim();

      // 3) 모든 클라이언트에 리로드 요청
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      clients.forEach((client) => {
        try { client.postMessage({ type: 'SW_KILL_RELOAD' }); } catch { /* ignore */ }
      });

      // 4) 스스로 언레지스터
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
    })(),
  );
});

// 요청은 전부 네트워크로 바이패스 (SW 개입 없음)
self.addEventListener('fetch', () => {
  // intentionally no-op: 브라우저가 네이티브로 처리
});
