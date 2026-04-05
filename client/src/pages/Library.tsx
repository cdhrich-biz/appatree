import { useState } from 'react';
import { ArrowLeft, Trash2, Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

export default function Library() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'recent'>('bookmarks');

  const bookmarksQuery = trpc.library.bookmarks.useQuery({ limit: 50, offset: 0 });
  const historyQuery = trpc.library.history.useQuery({ limit: 50, offset: 0 });
  const removeBookmarkMutation = trpc.library.removeBookmark.useMutation({
    onSuccess: () => bookmarksQuery.refetch(),
  });

  const bookmarkItems = bookmarksQuery.data ?? [];
  const historyItems = historyQuery.data ?? [];
  const displayItems = activeTab === 'bookmarks' ? bookmarkItems : historyItems;
  const isLoading = activeTab === 'bookmarks' ? bookmarksQuery.isLoading : historyQuery.isLoading;

  const handlePlay = (videoId: string, title: string, progressSeconds?: number) => {
    const url = `/player?id=${videoId}&title=${encodeURIComponent(title)}${progressSeconds ? `&t=${progressSeconds}` : ''}`;
    navigate(url);
  };

  const handleRemoveBookmark = (videoId: string) => {
    removeBookmarkMutation.mutate({ videoId });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="뒤로가기">
          <ArrowLeft size={32} className="text-gray-700" />
        </button>
        <div className="flex-1"><h1 className="text-senior-heading text-gray-800">내 서재</h1></div>
      </header>

      <div className="bg-white border-b border-gray-200 px-4 py-3 flex gap-2">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`btn-senior-touch ${activeTab === 'bookmarks' ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-600'}`}
        >
          즐겨찾기
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`btn-senior-touch ${activeTab === 'recent' ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-600'}`}
        >
          최근 재생
        </button>
      </div>

      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-senior-body text-gray-600">불러오는 중...</div>
          </div>
        ) : displayItems.length > 0 ? (
          <div className="space-y-4">
            {displayItems.map((item) => {
              const isHistory = 'progressSeconds' in item;
              const progress = isHistory ? (item as { progressSeconds: number; totalSeconds: number }).progressSeconds : 0;
              const total = isHistory ? (item as { progressSeconds: number; totalSeconds: number }).totalSeconds : 0;
              const progressPct = total > 0 ? (progress / total) * 100 : 0;

              return (
                <div key={item.id} className="list-item-senior bg-white border-2 border-gray-200 hover:border-green-600 rounded-lg p-4 transition-all">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-20 h-20 rounded-lg object-cover" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-2xl">🎧</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-senior-button text-gray-800 mb-1">{item.title}</h3>
                        <p className="text-senior-body text-gray-600">{item.channelName ?? ''}</p>
                      </div>
                      {isHistory && total > 0 && (
                        <div className="mt-2">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-full rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{Math.floor(progressPct)}% 재생</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => handlePlay(item.videoId, item.title, isHistory ? progress : undefined)}
                        className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
                        aria-label={`${item.title} ${isHistory && progress > 0 ? '이어 듣기' : '재생'}`}
                      >
                        <Play size={24} fill="white" />
                      </button>
                      {activeTab === 'bookmarks' && (
                        <button
                          onClick={() => handleRemoveBookmark(item.videoId)}
                          className="p-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                          aria-label={`${item.title} 제거`}
                        >
                          <Trash2 size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-senior-heading text-gray-600 mb-4">
              {activeTab === 'bookmarks' ? '즐겨찾기한 책이 없습니다' : '최근 재생한 책이 없습니다'}
            </p>
            <button onClick={() => navigate('/search')} className="btn-senior-large bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors">
              책 찾아보기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
