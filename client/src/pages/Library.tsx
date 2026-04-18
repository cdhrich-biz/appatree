import { useState } from 'react';
import { Trash2, Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import SkeletonCard from '@/components/SkeletonCard';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Library() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'recent'>('bookmarks');
  const [pendingRemove, setPendingRemove] = useState<{ videoId: string; title: string } | null>(null);

  const bookmarksQuery = trpc.library.bookmarks.useQuery({ limit: 50, offset: 0 });
  const historyQuery = trpc.library.history.useQuery({ limit: 50, offset: 0 });
  const removeBookmarkMutation = trpc.library.removeBookmark.useMutation({
    onSuccess: () => {
      bookmarksQuery.refetch();
      toast.success('즐겨찾기에서 제거했습니다');
    },
  });

  const bookmarkItems = bookmarksQuery.data ?? [];
  const historyItems = historyQuery.data ?? [];
  const displayItems = activeTab === 'bookmarks' ? bookmarkItems : historyItems;
  const isLoading = activeTab === 'bookmarks' ? bookmarksQuery.isLoading : historyQuery.isLoading;

  const handlePlay = (videoId: string, title: string, progressSeconds?: number) => {
    const url = `/player?id=${videoId}&title=${encodeURIComponent(title)}${progressSeconds ? `&t=${progressSeconds}` : ''}`;
    navigate(url);
  };

  const handleRemoveBookmarkRequest = (videoId: string, title: string) => {
    setPendingRemove({ videoId, title });
  };

  const confirmRemove = () => {
    if (pendingRemove) {
      removeBookmarkMutation.mutate({ videoId: pendingRemove.videoId });
      setPendingRemove(null);
    }
  };

  return (
    <AppShell title="즐겨찾기" subtitle="저장한 책과 최근 들은 책">
      <div className="flex gap-2 mb-5" role="tablist">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className="btn-secondary flex-1"
          data-active={activeTab === 'bookmarks'}
          role="tab"
          aria-selected={activeTab === 'bookmarks'}
        >
          즐겨찾기
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className="btn-secondary flex-1"
          data-active={activeTab === 'recent'}
          role="tab"
          aria-selected={activeTab === 'recent'}
        >
          최근 재생
        </button>
      </div>

      {isLoading ? (
        <SkeletonCard count={4} />
      ) : displayItems.length > 0 ? (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const isHistory = 'progressSeconds' in item;
            const progress = isHistory ? (item as { progressSeconds: number; totalSeconds: number }).progressSeconds : 0;
            const total = isHistory ? (item as { progressSeconds: number; totalSeconds: number }).totalSeconds : 0;
            const progressPct = total > 0 ? Math.round((progress / total) * 100) : 0;

            return (
              <article key={item.id} className="list-item-senior">
                <div className="flex-shrink-0">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">
                      🎧
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-senior-button line-clamp-2 mb-0.5">{item.title}</h3>
                    <p className="text-senior-body text-gray-600 truncate">{item.channelName ?? ''}</p>
                  </div>
                  {isHistory && total > 0 && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-full rounded-full" style={{ width: `${progressPct}%` }} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{progressPct}% 들음</p>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2 justify-center">
                  <button
                    onClick={() => handlePlay(item.videoId, item.title, isHistory ? progress : undefined)}
                    className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-full transition-colors"
                    aria-label={`${item.title} ${isHistory && progress > 0 ? '이어 듣기' : '재생'}`}
                  >
                    <Play size={24} fill="white" />
                  </button>
                  {activeTab === 'bookmarks' && (
                    <button
                      onClick={() => handleRemoveBookmarkRequest(item.videoId, item.title)}
                      className="p-2 rounded-full transition-colors hover:bg-red-50 text-red-500"
                      aria-label={`${item.title} 즐겨찾기 해제`}
                    >
                      <Trash2 size={22} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-senior-heading text-gray-700 mb-2">
            {activeTab === 'bookmarks' ? '즐겨찾기한 책이 없습니다' : '최근 재생한 책이 없습니다'}
          </p>
          <p className="text-senior-body text-gray-500 mb-6">마음에 드는 책을 저장해 보세요</p>
          <button onClick={() => navigate('/search')} className="btn-primary">
            책 찾아보기
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        title="즐겨찾기에서 제거할까요?"
        description={pendingRemove?.title}
        confirmLabel="네, 제거해요"
        cancelLabel="아니요"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </AppShell>
  );
}
