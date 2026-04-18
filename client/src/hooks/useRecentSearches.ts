import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'appatree.recentSearches.v1';
const MAX_ITEMS = 5;

function readStore(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeStore(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota/private mode: 무시 */
  }
}

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(readStore());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStore());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((q: string) => {
    const query = q.trim();
    if (!query) return;
    setItems((prev) => {
      const next = [query, ...prev.filter((s) => s !== query)].slice(0, MAX_ITEMS);
      writeStore(next);
      return next;
    });
  }, []);

  const remove = useCallback((q: string) => {
    setItems((prev) => {
      const next = prev.filter((s) => s !== q);
      writeStore(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStore([]);
    setItems([]);
  }, []);

  return { items, add, remove, clear };
}
