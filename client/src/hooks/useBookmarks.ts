import { useCallback, useEffect, useState } from 'react';

export interface Bookmark {
  videoId: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  duration?: string;
  createdAt: number;
}

const STORAGE_KEY = 'appatree.bookmarks.v1';

function readStore(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((b) => b && typeof b.videoId === 'string') : [];
  } catch {
    return [];
  }
}

function writeStore(items: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota/private mode: 무시 */
  }
}

export function useBookmarks() {
  const [items, setItems] = useState<Bookmark[]>(readStore);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStore());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((b: Omit<Bookmark, 'createdAt'>) => {
    setItems((prev) => {
      const next = [{ ...b, createdAt: Date.now() }, ...prev.filter((x) => x.videoId !== b.videoId)];
      writeStore(next);
      return next;
    });
  }, []);

  const remove = useCallback((videoId: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.videoId !== videoId);
      writeStore(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStore([]);
    setItems([]);
  }, []);

  const has = useCallback((videoId: string) => items.some((x) => x.videoId === videoId), [items]);

  return { items, add, remove, clear, has };
}
