interface SkeletonCardProps {
  count?: number;
  variant?: 'list' | 'tile' | 'featured';
}

export default function SkeletonCard({ count = 4, variant = 'list' }: SkeletonCardProps) {
  if (variant === 'tile') {
    return (
      <div className="grid grid-cols-2 gap-4" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border-2 border-[color:var(--app-border)] bg-[color:var(--app-muted)] animate-pulse"
            style={{ minHeight: 128 }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div
        className="rounded-3xl border-2 border-[color:var(--app-border)] bg-[color:var(--app-muted)] animate-pulse"
        style={{ minHeight: 120 }}
        aria-hidden
      />
    );
  }

  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label="불러오는 중">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 rounded-2xl border-2 border-[color:var(--app-border)] bg-[color:var(--app-card)] animate-pulse"
        >
          <div className="w-24 h-24 rounded-2xl bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-5 bg-gray-200 rounded-md w-full" />
            <div className="h-5 bg-gray-200 rounded-md w-3/4" />
            <div className="h-4 bg-gray-100 rounded-md w-1/2 mt-3" />
          </div>
        </div>
      ))}
      <span className="sr-only">불러오는 중입니다</span>
    </div>
  );
}
