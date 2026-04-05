import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Mic, Search as SearchIcon, Heart } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

interface YouTubeSnippet {
  title: string;
  channelTitle: string;
  thumbnails: { medium?: { url: string } };
  description: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: YouTubeSnippet;
}

export default function SearchResults() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
      setSubmittedQuery(q);
    }
  }, []);

  const { data, isLoading } = trpc.youtube.search.useQuery(
    { query: submittedQuery, maxResults: 20 },
    { enabled: submittedQuery.length > 0 }
  );

  const items = (data?.items as YouTubeSearchItem[] | undefined) ?? [];

  const bookmarkMutation = trpc.library.addBookmark.useMutation();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSubmittedQuery(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { replace: true });
    }
  };

  const handlePlayClick = (item: YouTubeSearchItem) => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    navigate(`/player?id=${videoId}&title=${encodeURIComponent(title)}`);
  };

  const handleBookmark = (item: YouTubeSearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    bookmarkMutation.mutate({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url,
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
        <div className="flex gap-2">
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
      </div>

      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-senior-body text-gray-600">검색 중입니다...</div>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id.videoId}
                className="list-item-senior bg-white border-2 border-gray-200 hover:border-green-600 rounded-lg p-4 cursor-pointer transition-all"
                onClick={() => handlePlayClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlayClick(item); }}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={item.snippet.thumbnails.medium?.url ?? ''}
                      alt={item.snippet.title}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-senior-button text-gray-800 mb-1">{item.snippet.title}</h3>
                      <p className="text-senior-body text-gray-600">{item.snippet.channelTitle}</p>
                    </div>
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
                      <Heart size={24} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
