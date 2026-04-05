import { useState } from 'react';
import { ArrowLeft, Trash2, Play } from 'lucide-react';
import { useLocation } from 'wouter';

interface BookmarkItem {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  addedDate: Date;
  lastPlayed?: Date;
}

export default function Library() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'recent'>('bookmarks');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([
    {
      id: '1',
      title: '아버지가 물려준 것들',
      channel: '아름다운 소리책방',
      thumbnail: 'https://via.placeholder.com/160x90?text=Book+1',
      addedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastPlayed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      title: '따뜻한 말씀 모음',
      channel: '시니어 문학관',
      thumbnail: 'https://via.placeholder.com/160x90?text=Book+2',
      addedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  ]);

  const [recentBooks] = useState<BookmarkItem[]>([
    {
      id: '3',
      title: '인생의 의미를 찾아서',
      channel: '한국 오디오북 협회',
      thumbnail: 'https://via.placeholder.com/160x90?text=Book+3',
      addedDate: new Date(),
      lastPlayed: new Date(),
    },
    {
      id: '4',
      title: '할머니의 요리 이야기',
      channel: '가족 이야기 채널',
      thumbnail: 'https://via.placeholder.com/160x90?text=Book+4',
      addedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      lastPlayed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);

  const handleRemoveBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePlayBook = (book: BookmarkItem) => {
    navigate(`/player?id=${book.id}&title=${encodeURIComponent(book.title)}`);
  };

  const displayBooks = activeTab === 'bookmarks' ? bookmarks : recentBooks;

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
          <h1 className="text-senior-heading text-gray-800">내 서재</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex gap-2">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`btn-senior-touch ${
            activeTab === 'bookmarks'
              ? 'bg-green-700 text-white'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-600'
          }`}
        >
          즐겨찾기
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`btn-senior-touch ${
            activeTab === 'recent'
              ? 'bg-green-700 text-white'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-600'
          }`}
        >
          최근 재생
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        {displayBooks.length > 0 ? (
          <div className="space-y-4">
            {displayBooks.map((book) => (
              <div
                key={book.id}
                className="list-item-senior bg-white border-2 border-gray-200 hover:border-green-600 rounded-lg p-4 transition-all"
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-senior-button text-gray-800 mb-1">
                        {book.title}
                      </h3>
                      <p className="text-senior-body text-gray-600">
                        {book.channel}
                      </p>
                    </div>
                    {book.lastPlayed && (
                      <p className="text-senior-body text-gray-500">
                        마지막 재생: {book.lastPlayed.toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => handlePlayBook(book)}
                      className="p-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
                      aria-label={`${book.title} 재생`}
                    >
                      <Play size={24} fill="white" />
                    </button>
                    {activeTab === 'bookmarks' && (
                      <button
                        onClick={() => handleRemoveBookmark(book.id)}
                        className="p-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        aria-label={`${book.title} 제거`}
                      >
                        <Trash2 size={24} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-senior-heading text-gray-600 mb-4">
              {activeTab === 'bookmarks'
                ? '즐겨찾기한 책이 없습니다'
                : '최근 재생한 책이 없습니다'}
            </p>
            <button
              onClick={() => navigate('/search')}
              className="btn-senior-large bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
            >
              책 찾아보기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
