import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { usePreferences } from '@/contexts/PreferencesContext';
import AppShell from '@/components/AppShell';
import QuickTools from '@/components/QuickTools';

type VoiceButtonState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

export default function Home() {
  const [, navigate] = useLocation();
  const { speak } = usePreferences();
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
  }, [navigate, speak]);

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

  const voiceHint = statusMessage || '듣고 싶은 책을 말씀해주세요';

  return (
    <AppShell title="아빠트리" subtitle="시니어 오디오북">
      {announcements.length > 0 && (
        <div className="mb-6 space-y-2" role="region" aria-label="공지사항">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl p-4 ${
                a.type === 'urgent'
                  ? 'bg-red-50 border-2 border-red-200'
                  : a.type === 'warning'
                  ? 'bg-amber-50 border-2 border-amber-200'
                  : 'bg-blue-50 border-2 border-blue-200'
              }`}
            >
              <p className="text-senior-button">{a.title}</p>
              <p className="text-senior-body text-gray-700 mt-1">{a.content}</p>
            </div>
          ))}
        </div>
      )}

      <QuickTools />

      <section
        className="flex flex-col items-center text-center py-4"
        aria-labelledby="voice-heading"
      >
        <h2 id="voice-heading" className="sr-only">음성 검색</h2>
        <button
          onClick={handleVoiceButtonClick}
          disabled={voiceState !== 'idle'}
          className={`voice-button ${voiceState}`}
          aria-label="음성 검색 시작"
          aria-pressed={voiceState === 'recording'}
        >
          <Mic size={80} strokeWidth={2.2} />
        </button>
        <p
          className="text-senior-heading mt-8 max-w-sm"
          aria-live="polite"
        >
          {voiceHint}
        </p>
        {voiceState === 'recording' && (
          <div className="flex justify-center gap-1.5 mt-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-1.5 h-8 bg-green-600 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}
      </section>

      {recentHistory.length > 0 && (
        <section className="mt-10" aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="text-senior-heading mb-4">이어 듣기</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {recentHistory.map((item) => {
              const pct = item.totalSeconds > 0
                ? Math.round((item.progressSeconds / item.totalSeconds) * 100)
                : 0;
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    navigate(
                      `/player?id=${item.videoId}&title=${encodeURIComponent(item.title)}&t=${item.progressSeconds}`,
                    )
                  }
                  className="card-senior flex-shrink-0 w-56 snap-start text-left"
                  aria-label={`${item.title} 이어 듣기, ${pct}% 완료`}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-28 rounded-2xl object-cover mb-3"
                    />
                  ) : (
                    <div className="w-full h-28 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mb-3">
                      🎧
                    </div>
                  )}
                  <p className="text-senior-body font-semibold line-clamp-2 mb-3">{item.title}</p>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div className="bg-green-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5">{pct}% 들음</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mt-10" aria-labelledby="category-heading">
          <h2 id="category-heading" className="text-senior-heading mb-4">카테고리</h2>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <button
                key={category.slug}
                onClick={() => handleCategoryClick(category.searchQuery)}
                className="tile-senior"
                aria-label={`${category.name} 카테고리 열기`}
              >
                <span className="text-5xl" aria-hidden>{category.icon}</span>
                <span className="text-senior-button">{category.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
