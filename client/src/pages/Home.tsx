import { useState, useRef, useEffect } from 'react';
import { Mic, Settings, Home as HomeIcon, Search, MessageCircle, BookOpen } from 'lucide-react';
import { useLocation } from 'wouter';

type VoiceButtonState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

interface Category {
  id: string;
  name: string;
  icon: string;
  searchQuery: string;
}

const categories: Category[] = [
  { id: 'novel', name: '소설', icon: '📖', searchQuery: '소설 오디오북' },
  { id: 'essay', name: '에세이', icon: '✍️', searchQuery: '에세이 오디오북' },
  { id: 'history', name: '역사', icon: '🏛️', searchQuery: '역사 오디오북' },
  { id: 'economy', name: '경제', icon: '💼', searchQuery: '경제 오디오북' },
  { id: 'selfhelp', name: '자기계발', icon: '🌱', searchQuery: '자기계발 오디오북' },
  { id: 'popular', name: '인기 오디오북', icon: '⭐', searchQuery: '인기 오디오북' },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [voiceState, setVoiceState] = useState<VoiceButtonState>('idle');
  const [recognitionText, setRecognitionText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ko-KR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        setVoiceState('recording');
        setStatusMessage('듣고 있습니다...');
        speakMessage('말씀해주세요');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setRecognitionText(transcript);
          } else {
            interimTranscript += transcript;
          }
        }
        if (interimTranscript) {
          setStatusMessage(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        setVoiceState('error');
        setStatusMessage(`오류: ${event.error}`);
        speakMessage('다시 말씀해주세요');
        setTimeout(() => setVoiceState('idle'), 3000);
      };

      recognitionRef.current.onend = () => {
        if (recognitionText) {
          setVoiceState('processing');
          setStatusMessage('검색 중입니다...');
          // Navigate to search results with the recognized text
          setTimeout(() => {
            navigate(`/search?q=${encodeURIComponent(recognitionText)}`);
          }, 500);
        } else {
          setVoiceState('idle');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [navigate, recognitionText]);

  const speakMessage = (message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9; // Senior-friendly speed
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceButtonClick = () => {
    if (voiceState === 'idle') {
      setRecognitionText('');
      setStatusMessage('');
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    }
  };

  const handleCategoryClick = (category: Category) => {
    navigate(`/search?q=${encodeURIComponent(category.searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎧</div>
          <h1 className="text-senior-title">아빠트리</h1>
        </div>
        <button
          className="p-3 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="설정"
          onClick={() => navigate('/settings')}
        >
          <Settings size={32} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
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

          {/* Status Message */}
          <div className="mt-8 text-center">
            <p className="text-senior-body text-gray-700 mb-2">
              {statusMessage || '듣고 싶은 책을 말씀해주세요'}
            </p>
            {voiceState === 'recording' && (
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-6 bg-green-600 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="w-full max-w-2xl">
          <h2 className="text-senior-heading text-gray-800 mb-6 text-center">
            카테고리
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
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
        <button
          className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-100 text-green-700"
          aria-label="홈"
          aria-current="page"
        >
          <HomeIcon size={32} />
          <span className="text-senior-button text-xs">홈</span>
        </button>
        <button
          onClick={() => navigate('/search')}
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="검색"
        >
          <Search size={32} />
          <span className="text-senior-button text-xs">검색</span>
        </button>
        <button
          onClick={() => navigate('/chat')}
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="AI 채팅"
        >
          <MessageCircle size={32} />
          <span className="text-senior-button text-xs">AI 채팅</span>
        </button>
        <button
          onClick={() => navigate('/library')}
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="내 서재"
        >
          <BookOpen size={32} />
          <span className="text-senior-button text-xs">내 서재</span>
        </button>
      </nav>
    </div>
  );
}
