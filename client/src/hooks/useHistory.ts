import { useCallback, useEffect, useState } from 'react';

export interface HistoryItem {
  videoId: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  duration?: string;
  progressSeconds: number;
  totalSeconds: number;
  lastPlayedAt: number;
}

const STORAGE_KEY = 'appatree.history.v1';
const MAX_ITEMS = 100;

function readStore(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((h) => h && typeof h.videoId === 'string') : [];
  } catch {
    return [];
  }
}

function writeStore(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota/private mode: 무시 */
  }
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(readStore);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStore());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 재생 시작 시 기록 추가/갱신 (최신이 맨 앞).
  // 기존 항목의 진행률은 유지 — 로드 시 0으로 덮어써 진행률이 사라지는 것을 방지.
  const upsert = useCallback((h: Omit<HistoryItem, 'lastPlayedAt'>) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.videoId === h.videoId);
      const merged: HistoryItem = {
        ...existing,
        ...h,
        progressSeconds: h.progressSeconds || existing?.progressSeconds || 0,
        totalSeconds: h.totalSeconds || existing?.totalSeconds || 0,
        lastPlayedAt: Date.now(),
      };
      const next = [merged, ...prev.filter((x) => x.videoId !== h.videoId)].slice(0, MAX_ITEMS);
      writeStore(next);
      return next;
    });
  }, []);

  // 재생 진행률만 갱신 (기록이 있을 때)
  const updateProgress = useCallback((videoId: string, progressSeconds: number, totalSeconds?: number) => {
    setItems((prev) => {
      let changed = false;
      const next = prev.map((x) => {
        if (x.videoId !== videoId) return x;
        changed = true;
        return {
          ...x,
          progressSeconds,
          totalSeconds: totalSeconds ?? x.totalSeconds,
          lastPlayedAt: Date.now(),
        };
      });
      if (!changed) return prev;
      writeStore(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStore([]);
    setItems([]);
  }, []);

  return { items, upsert, updateProgress, clear };
}
