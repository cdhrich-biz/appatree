import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Mic, Search as SearchIcon } from 'lucide-react';
import { useLocation } from 'wouter';

interface SearchResult {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  views: string;
}

export default function SearchResults() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'views'>('relevance');

  // Get search query from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
      // TODO: Fetch results from YouTube API
      // For now, show mock data
      setResults([
        {
          id: '1',
          title: '아버지가 물려준 것들 - 오디오북',
          channel: '아름다운 소리책방',
          duration: '2:45:30',
          thumbnail: 'https://via.placeholder.com/320x180?text=Audiobook+1',
          views: '12.5만',
        },
        {
          id: '2',
          title: '인생의 의미를 찾아서 - 오디오북',
          channel: '한국 오디오북 협회',
          duration: '3:20:15',
          thumbnail: 'https://via.placeholder.com/320x180?text=Audiobook+2',
          views: '8.3만',
        },
        {
          id: '3',
          title: '따뜻한 말씀 모음 - 오디오북',
          channel: '시니어 문학관',
          duration: '1:55:45',
          thumbnail: 'https://via.placeholder.com/320x180?text=Audiobook+3',
          views: '5.2만',
        },
      ]);
    }
  }, []);

  const handlePlayClick = (result: SearchResult) => {
    navigate(`/player?id=${result.id}&title=${encodeURIComponent(result.title)}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft size={32} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-senior-heading text-gray-800">
            '{searchQuery}' 검색 결과
          </h1>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-4">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center bg-white border-2 border-gray-300 rounded-lg px-4 py-3">
            <SearchIcon size={24} className="text-gray-600 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어 입력"
              className="flex-1 text-senior-body outline-none"
            />
          </div>
          <button
            className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
            aria-label="음성 검색"
          >
            <Mic size={24} />
          </button>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 overflow-x-auto">
          {(['relevance', 'newest', 'views'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`btn-senior-touch whitespace-nowrap ${
                sortBy === option
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-600'
              }`}
            >
              {option === 'relevance' && '관련성'}
              {option === 'newest' && '최신순'}
              {option === 'views' && '조회수'}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-senior-body text-gray-600">검색 중입니다...</div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="list-item-senior bg-white border-2 border-gray-200 hover:border-green-600 rounded-lg p-4 cursor-pointer transition-all"
                onClick={() => handlePlayClick(result)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handlePlayClick(result);
                  }
                }}
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-senior-button text-gray-800 mb-1">
                        {result.title}
                      </h3>
                      <p className="text-senior-body text-gray-600 mb-2">
                        {result.channel}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-senior-body text-gray-600">
                        {result.duration}
                      </span>
                      <span className="text-senior-body text-gray-500">
                        조회수: {result.views}
                      </span>
                    </div>
                  </div>

                  {/* Play Button */}
                  <div className="flex-shrink-0 flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayClick(result);
                      }}
                      className="p-4 bg-green-700 hover:bg-green-800 text-white rounded-full transition-colors"
                      aria-label={`${result.title} 재생`}
                    >
                      <Play size={32} fill="white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32">
            <p className="text-senior-body text-gray-600 mb-4">
              검색 결과가 없습니다.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="btn-senior-large bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
            >
              AI 추천 받기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
