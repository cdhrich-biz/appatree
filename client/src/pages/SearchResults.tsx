import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Play, Search as SearchIcon, Heart } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface YouTubeSnippet {
  title: string;
  channelTitle: string;
  thumbnails: { medium?: { url: string }; high?: { url: string } };
  description: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: YouTubeSnippet;
}

interface YouTubeVideoDetail {
  id: string;
  snippet: { title: string; channelTitle: string; thumbnails: { high?: { url: string } } };
  contentDetails: { duration: string };
  statistics: { viewCount: string };
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatViews(count: string): string {
  const n = parseInt(count, 10);
  if (isNaN(n)) return '';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만회`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천회`;
  return `${n}회`;
}

export default function SearchResults() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'viewCount'>('relevance');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) { setSearchQuery(q); setSubmittedQuery(q); }
  }, []);

  const { data, isLoading } = trpc.youtube.search.useQuery(
    { query: submittedQuery, maxResults: 20, order: sortBy },
    { enabled: submittedQuery.length > 0 }
  );

  const items = (data?.items as YouTubeSearchItem[] | undefined) ?? [];
  const videoIds = useMemo(() => items.map((i) => i.id.videoId), [items]);

  const { data: detailsData } = trpc.youtube.videosBatch.useQuery(
    { videoIds },
    { enabled: videoIds.length > 0 }
  );

  const detailsMap = useMemo(() => {
    const map = new Map<string, YouTubeVideoDetail>();
    const detailItems = (detailsData?.items as YouTubeVideoDetail[] | undefined) ?? [];
    detailItems.forEach((d) => map.set(d.id, d));
    return map;
  }, [detailsData]);

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const bookmarkMutation = trpc.library.addBookmark.useMutation({
    onSuccess: (_data, variables) => {
      setBookmarkedIds((prev) => new Set(prev).add(variables.videoId));
      toast.success('즐겨찾기에 추가되었습니다');
    },
    onError: () => {
      toast.error('로그인이 필요합니다');
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSubmittedQuery(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { replace: true });
    }
  };

  const handlePlayClick = (item: YouTubeSearchItem) => {
    navigate(`/player?id=${item.id.videoId}&title=${encodeURIComponent(item.snippet.title)}`);
  };

  const handleBookmark = (item: YouTubeSearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const detail = detailsMap.get(item.id.videoId);
    bookmarkMutation.mutate({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: detail?.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url,
      duration: detail?.contentDetails.duration,
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="뒤로가기">
          <ArrowLeft size={32} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-senior-heading text-gray-800">'{submittedQuery}' 검색 결과</h1>
        </div>
      </header>

      <div className="bg-gray-50 border-b border-gray-200 px-4 py-4">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center bg-white border-2 border-gray-300 rounded-lg px-4 py-3">
            <SearchIcon size={24} className="text-gray-600 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="검색어 입력"
              className="flex-1 text-senior-body outline-none"
            />
          </div>
          <button onClick={handleSearch} className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors" aria-label="검색">
            <SearchIcon size={24} />
          </button>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 overflow-x-auto">
          {([['relevance', '관련성'], ['date', '최신순'], ['viewCount', '조회수']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              className={`btn-senior-touch whitespace-nowrap ${sortBy === value ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-senior-body text-gray-600">검색 중입니다...</div>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => {
              const detail = detailsMap.get(item.id.videoId);
              const duration = detail ? parseDuration(detail.contentDetails.duration) : '';
              const views = detail ? formatViews(detail.statistics.viewCount) : '';

              return (
                <div
                  key={item.id.videoId}
                  className="list-item-senior bg-white border-2 border-gray-200 hover:border-green-600 rounded-lg p-4 cursor-pointer transition-all"
                  onClick={() => handlePlayClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlayClick(item); }}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 relative">
                      <img
                        src={item.snippet.thumbnails.medium?.url ?? ''}
                        alt={item.snippet.title}
                        className="w-28 h-20 rounded-lg object-cover"
                      />
                      {duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                          {duration}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-senior-button text-gray-800 mb-1 line-clamp-2">{item.snippet.title}</h3>
                        <p className="text-senior-body text-gray-600">{item.snippet.channelTitle}</p>
                      </div>
                      {views && (
                        <span className="text-senior-body text-gray-500">조회수 {views}</span>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col gap-2 items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlayClick(item); }}
                        className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-full transition-colors"
                        aria-label={`${item.snippet.title} 재생`}
                      >
                        <Play size={28} fill="white" />
                      </button>
                      <button
                        onClick={(e) => handleBookmark(item, e)}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
                        aria-label="즐겨찾기"
                      >
                        <Heart size={24} className={bookmarkedIds.has(item.id.videoId) ? "text-red-500 fill-red-500" : "text-gray-400 hover:text-red-500"} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : submittedQuery ? (
          <div className="flex flex-col items-center justify-center h-32">
            <p className="text-senior-body text-gray-600 mb-4">검색 결과가 없습니다.</p>
            <button onClick={() => navigate('/chat')} className="btn-senior-large bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors">
              AI 추천 받기
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
