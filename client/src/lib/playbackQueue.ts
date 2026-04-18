export interface QueueItem {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  channelName?: string;
}

const STORAGE_KEY = 'appatree.queue.v1';

interface StoredQueue {
  items: QueueItem[];
  index: number;
  updatedAt: number;
}

function read(): StoredQueue | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.items) &&
      typeof parsed.index === 'number'
    ) {
      return parsed as StoredQueue;
    }
    return null;
  } catch {
    return null;
  }
}

function write(q: StoredQueue) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch {
    /* quota/SSR: 무시 */
  }
}

export const playbackQueue = {
  set(items: QueueItem[], currentVideoId: string) {
    const index = items.findIndex((i) => i.videoId === currentVideoId);
    write({ items, index: index >= 0 ? index : 0, updatedAt: Date.now() });
  },

  get(): StoredQueue | null {
    return read();
  },

  getCurrent(): QueueItem | null {
    const q = read();
    if (!q) return null;
    return q.items[q.index] ?? null;
  },

  getNext(): QueueItem | null {
    const q = read();
    if (!q) return null;
    return q.items[q.index + 1] ?? null;
  },

  getPrevious(): QueueItem | null {
    const q = read();
    if (!q) return null;
    return q.items[q.index - 1] ?? null;
  },

  advance(): QueueItem | null {
    const q = read();
    if (!q) return null;
    if (q.index + 1 >= q.items.length) return null;
    const next = { ...q, index: q.index + 1, updatedAt: Date.now() };
    write(next);
    return next.items[next.index];
  },

  retreat(): QueueItem | null {
    const q = read();
    if (!q) return null;
    if (q.index <= 0) return null;
    const prev = { ...q, index: q.index - 1, updatedAt: Date.now() };
    write(prev);
    return prev.items[prev.index];
  },

  alignTo(videoId: string) {
    const q = read();
    if (!q) return;
    const idx = q.items.findIndex((i) => i.videoId === videoId);
    if (idx >= 0 && idx !== q.index) {
      write({ ...q, index: idx, updatedAt: Date.now() });
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
