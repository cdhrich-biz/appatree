import { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Search as SearchIcon, Heart, Mic } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import SkeletonCard from '@/components/SkeletonCard';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { X } from 'lucide-react';
import { playbackQueue } from '@/lib/playbackQueue';

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
  const { speak } = usePreferences();
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'viewCount'>('relevance');
  const announcedForRef = useRef<string>('');
  const recent = useRecentSearches();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
      setSubmittedQuery(q);
      recent.add(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = trpc.youtube.search.useQuery(
    { query: submittedQuery, maxResults: 20, order: sortBy },
    { enabled: submittedQuery.length > 0 }
  );

  const items = (data?.items as YouTubeSearchItem[] | undefined) ?? [];
  const videoIds = useMemo(() => items.map((i) => i.id.videoId), [items]);

  useEffect(() => {
    if (!data || !submittedQuery) return;
    const key = `${submittedQuery}::${sortBy}`;
    if (announcedForRef.current === key) return;
    announcedForRef.current = key;
    const count = items.length;
    if (count > 0) speak(`${count}건 찾았습니다`);
    else speak('검색 결과가 없습니다');
  }, [data, submittedQuery, sortBy, items.length, speak]);

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
    const q = searchQuery.trim();
    if (q) {
      setSubmittedQuery(q);
      recent.add(q);
      navigate(`/search?q=${encodeURIComponent(q)}`, { replace: true });
    }
  };

  const handleRecentClick = (q: string) => {
    setSearchQuery(q);
    setSubmittedQuery(q);
    recent.add(q);
    navigate(`/search?q=${encodeURIComponent(q)}`, { replace: true });
  };

  const handleVoice = () => {
    const SpeechRecognitionClass = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognitionClass) {
      toast.error('이 브라우저는 음성 검색을 지원하지 않습니다');
      return;
    }
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'ko-KR';
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setSubmittedQuery(transcript);
      navigate(`/search?q=${encodeURIComponent(transcript)}`, { replace: true });
    };
    recognition.start();
  };

  const handlePlayClick = (item: YouTubeSearchItem) => {
    const queueItems = items.map((it) => {
      const detail = detailsMap.get(it.id.videoId);
      return {
        videoId: it.id.videoId,
        title: it.snippet.title,
        thumbnailUrl: detail?.snippet.thumbnails.high?.url ?? it.snippet.thumbnails.medium?.url,
        channelName: it.snippet.channelTitle,
      };
    });
    playbackQueue.set(queueItems, item.id.videoId);
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

  const sortOptions = [
    ['relevance', '관련성'],
    ['date', '최신순'],
    ['viewCount', '조회수'],
  ] as const;

  return (
    <AppShell
      title={submittedQuery ? `'${submittedQuery}'` : '검색'}
      subtitle={submittedQuery ? '검색 결과' : '듣고 싶은 책을 찾아보세요'}
      showBack
    >
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center bg-white rounded-2xl border-2 border-[color:var(--app-border)] px-4 focus-within:border-green-600">
          <SearchIcon size={24} className="text-gray-500 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="검색어 입력"
            className="flex-1 text-senior-body py-3 bg-transparent outline-none"
            aria-label="검색어 입력"
          />
        </div>
        <button onClick={handleVoice} className="btn-icon" aria-label="음성 검색">
          <Mic size={28} />
        </button>
        <button
          onClick={handleSearch}
          className="btn-primary px-4"
          style={{ minHeight: 56 }}
          aria-label="검색"
        >
          <SearchIcon size={26} />
        </button>
      </div>

      {submittedQuery && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {sortOptions.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              className="btn-secondary whitespace-nowrap"
              data-active={sortBy === value}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <SkeletonCard count={5} />
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => {
            const detail = detailsMap.get(item.id.videoId);
            const duration = detail ? parseDuration(detail.contentDetails.duration) : '';
            const views = detail ? formatViews(detail.statistics.viewCount) : '';
            const bookmarked = bookmarkedIds.has(item.id.videoId);

            return (
              <article
                key={item.id.videoId}
                className="list-item-senior cursor-pointer"
                onClick={() => handlePlayClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlayClick(item); }}
                aria-label={`${item.snippet.title} 재생`}
              >
                <div className="flex-shrink-0 relative">
                  <img
                    src={item.snippet.thumbnails.medium?.url ?? ''}
                    alt=""
                    className="w-28 h-28 rounded-2xl object-cover"
                  />
                  {duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-md">
                      {duration}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-senior-button line-clamp-2 mb-1">{item.snippet.title}</h3>
                    <p className="text-senior-body text-gray-600 truncate">{item.snippet.channelTitle}</p>
                  </div>
                  {views && <span className="text-sm text-gray-500">조회수 {views}</span>}
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2 justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayClick(item); }}
                    className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-full transition-colors"
                    aria-label="재생"
                  >
                    <Play size={24} fill="white" />
                  </button>
                  <button
                    onClick={(e) => handleBookmark(item, e)}
                    className="p-2 rounded-full transition-colors hover:bg-red-50"
                    aria-label={bookmarked ? '즐겨찾기 완료' : '즐겨찾기 추가'}
                    aria-pressed={bookmarked}
                  >
                    <Heart
                      size={24}
                      className={bookmarked ? 'text-red-500 fill-red-500' : 'text-gray-400'}
                    />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : submittedQuery ? (
        <div className="text-center py-16">
          <p className="text-senior-heading text-gray-700 mb-2">결과가 없습니다</p>
          <p className="text-senior-body text-gray-500 mb-6">AI 도우미가 추천해 드릴게요</p>
          <button onClick={() => navigate('/chat')} className="btn-primary">
            AI에게 물어보기
          </button>
        </div>
      ) : (
        <div className="py-10 space-y-8">
          {recent.items.length > 0 && (
            <section aria-labelledby="recent-heading">
              <div className="flex items-center justify-between mb-3">
                <h2 id="recent-heading" className="text-senior-heading">최근 검색</h2>
                <button
                  onClick={recent.clear}
                  className="text-senior-body text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg"
                  aria-label="최근 검색 전체 삭제"
                >
                  전체 지우기
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.items.map((q) => (
                  <div key={q} className="flex items-center">
                    <button
                      onClick={() => handleRecentClick(q)}
                      className="btn-secondary rounded-l-2xl rounded-r-none border-r-0"
                      style={{ minHeight: 48 }}
                    >
                      {q}
                    </button>
                    <button
                      onClick={() => recent.remove(q)}
                      className="btn-secondary rounded-l-none rounded-r-2xl px-3"
                      style={{ minHeight: 48 }}
                      aria-label={`${q} 최근 검색에서 제거`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="hint-heading">
            <h2 id="hint-heading" className="text-senior-heading mb-3">이런 말도 하실 수 있어요</h2>
            <div className="flex flex-wrap gap-2">
              {['감동적인 이야기', '편안한 역사 다큐', '트로트 메들리', '건강 상식', '어르신 뉴스'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleRecentClick(s)}
                  className="btn-secondary"
                  style={{ minHeight: 48 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
