import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Settings, Home as HomeIcon, Search, MessageCircle, BookOpen } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

type VoiceButtonState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

export default function Home() {
  const [, navigate] = useLocation();
  const [voiceState, setVoiceState] = useState<VoiceButtonState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionTextRef = useRef('');

  const categoriesQuery = trpc.config.categories.useQuery();
  const announcementsQuery = trpc.config.announcements.useQuery();
  const historyQuery = trpc.library.history.useQuery({ limit: 5, offset: 0 }, { retry: false });

  const categories = categoriesQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const recentHistory = historyQuery.data ?? [];

  const speakMessage = useCallback((message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognitionClass = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setVoiceState('recording');
      setStatusMessage('듣고 있습니다...');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          recognitionTextRef.current = transcript;
          setStatusMessage(transcript);
        } else {
          setStatusMessage(transcript);
        }
      }
    };

    recognition.onerror = () => {
      setVoiceState('error');
      setStatusMessage('다시 말씀해주세요');
      setTimeout(() => setVoiceState('idle'), 3000);
    };

    recognition.onend = () => {
      const text = recognitionTextRef.current;
      if (text) {
        setVoiceState('processing');
        setStatusMessage('검색 중입니다...');
        setTimeout(() => navigate(`/search?q=${encodeURIComponent(text)}`), 500);
        recognitionTextRef.current = '';
      } else {
        setVoiceState('idle');
      }
    };

    return () => { recognitionRef.current?.abort(); };
  }, [navigate, speakMessage]);

  const handleVoiceButtonClick = () => {
    if (voiceState === 'idle') {
      recognitionTextRef.current = '';
      setStatusMessage('');
      recognitionRef.current?.start();
    }
  };

  const handleCategoryClick = (searchQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎧</div>
          <h1 className="text-senior-title">아빠트리</h1>
        </div>
        <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors" aria-label="설정" onClick={() => navigate('/settings')}>
          <Settings size={32} className="text-gray-700" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6">
        {/* Announcement Banner */}
        {announcements.length > 0 && (
          <div className="w-full max-w-2xl mb-6">
            {announcements.map((a) => (
              <div key={a.id} className={`rounded-lg p-4 mb-2 ${a.type === 'urgent' ? 'bg-red-100 border-2 border-red-300' : a.type === 'warning' ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-blue-50 border-2 border-blue-200'}`}>
                <p className="text-senior-button font-bold">{a.title}</p>
                <p className="text-senior-body">{a.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Continue Listening */}
        {recentHistory.length > 0 && (
          <div className="w-full max-w-2xl mb-8">
            <h2 className="text-senior-heading text-gray-800 mb-4">이어 듣기</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recentHistory.map((item) => {
                const pct = item.totalSeconds > 0 ? (item.progressSeconds / item.totalSeconds) * 100 : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/player?id=${item.videoId}&title=${encodeURIComponent(item.title)}&t=${item.progressSeconds}`)}
                    className="flex-shrink-0 w-40 bg-white border-2 border-gray-200 hover:border-green-600 rounded-lg p-3 transition-all text-left"
                  >
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-20 rounded object-cover mb-2" />
                    ) : (
                      <div className="w-full h-20 rounded bg-gray-200 flex items-center justify-center text-2xl mb-2">🎧</div>
                    )}
                    <p className="text-sm font-bold text-gray-800 line-clamp-2 mb-1">{item.title}</p>
                    <div className="bg-gray-200 rounded-full h-1.5">
                      <div className="bg-green-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Voice Button */}
        <div className="mb-12 flex flex-col items-center">
          <button
            onClick={handleVoiceButtonClick}
            disabled={voiceState !== 'idle'}
            className={`voice-button ${voiceState} bg-green-700 hover:bg-green-800 disabled:opacity-50 flex items-center justify-center transition-all`}
            aria-label="음성 검색 버튼"
            aria-pressed={voiceState === 'recording'}
          >
            <Mic size={64} className="text-white" />
          </button>
          <div className="mt-8 text-center">
            <p className="text-senior-body text-gray-700 mb-2">
              {statusMessage || '듣고 싶은 책을 말씀해주세요'}
            </p>
            {voiceState === 'recording' && (
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1 h-6 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="w-full max-w-2xl">
          <h2 className="text-senior-heading text-gray-800 mb-6 text-center">카테고리</h2>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <button
                key={category.slug}
                onClick={() => handleCategoryClick(category.searchQuery)}
                className="list-item-senior flex flex-col items-center justify-center bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-green-600 rounded-lg p-6 transition-all"
                aria-label={`${category.name} 카테고리`}
              >
                <span className="text-4xl mb-2">{category.icon}</span>
                <span className="text-senior-button text-gray-800">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 px-4 py-3 flex justify-around">
        <button className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-100 text-green-700" aria-label="홈" aria-current="page">
          <HomeIcon size={32} /><span className="text-senior-button text-xs">홈</span>
        </button>
        <button onClick={() => navigate('/search')} className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" aria-label="검색">
          <Search size={32} /><span className="text-senior-button text-xs">검색</span>
        </button>
        <button onClick={() => navigate('/chat')} className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" aria-label="AI 채팅">
          <MessageCircle size={32} /><span className="text-senior-button text-xs">AI 채팅</span>
        </button>
        <button onClick={() => navigate('/library')} className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" aria-label="즐겨찾기">
          <BookOpen size={32} /><span className="text-senior-button text-xs">즐겨찾기</span>
        </button>
      </nav>
    </div>
  );
}
