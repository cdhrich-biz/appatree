import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Volume2, RotateCcw } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { usePreferences } from '@/contexts/PreferencesContext';
import AppShell from '@/components/AppShell';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Recommendation {
  title: string;
  author: string;
  description: string;
  searchQuery: string;
}

function parseRecommendations(text: string): Recommendation[] {
  const regex = /\[RECOMMEND\](.*?)\[\/RECOMMEND\]/gs;
  const results: Recommendation[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    try {
      results.push(JSON.parse(match[1]) as Recommendation);
    } catch { /* skip invalid JSON */ }
  }
  return results;
}

function stripRecommendTags(text: string): string {
  return text.replace(/\[RECOMMEND\].*?\[\/RECOMMEND\]/gs, '').trim();
}

export default function AIChat() {
  const [, navigate] = useLocation();
  const { speak } = usePreferences();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const greetingQuery = trpc.chat.greeting.useQuery(undefined, { retry: false });
  const sendMutation = trpc.chat.send.useMutation();

  useEffect(() => {
    const SpeechRecognitionClass = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    const greeting = greetingQuery.data ?? '안녕하세요! 저는 당신의 오디오북 추천 도우미입니다. 어떤 책을 찾고 계신가요?';
    setMessages([{ id: '0', role: 'assistant', content: greeting, timestamp: new Date() }]);
  }, [greetingQuery.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
        }
        if (transcript) setInputValue(transcript);
      };
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    const msgText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const result = await sendMutation.mutateAsync({ sessionId, message: msgText });
      setSessionId(result.sessionId);
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.message, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
      speak(stripRecommendTags(result.message).slice(0, 200));
    } catch {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '죄송합니다, 오류가 발생했습니다. 다시 시도해주세요.', timestamp: new Date() };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const presetMessages = [
    '오늘 듣기 좋은 책 추천해주세요',
    '감동적인 이야기를 찾고 있어요',
    '역사 관련 책을 추천해주세요',
    '편안한 마음으로 들을 수 있는 책은?',
  ];

  const showPresets = messages.length <= 1;

  const handleRestart = () => {
    const greeting = greetingQuery.data ?? '안녕하세요! 저는 당신의 오디오북 추천 도우미입니다. 어떤 책을 찾고 계신가요?';
    setMessages([{ id: '0', role: 'assistant', content: greeting, timestamp: new Date() }]);
    setSessionId(undefined);
    setInputValue('');
  };

  return (
    <AppShell
      title="AI 대화"
      subtitle="오디오북 추천 상담"
      showBack
      headerRight={
        messages.length > 1 ? (
          <button
            onClick={handleRestart}
            className="btn-icon"
            aria-label="새 대화 시작하기"
            title="새 대화"
          >
            <RotateCcw size={26} />
          </button>
        ) : undefined
      }
    >
      {showPresets && (
        <div className="mb-5">
          <p className="text-senior-body text-gray-600 mb-3">이렇게 물어볼 수 있어요</p>
          <div className="space-y-2">
            {presetMessages.map((msg) => (
              <button
                key={msg}
                onClick={() => setInputValue(msg)}
                className="w-full text-left card-senior text-senior-body"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 pb-24" role="log" aria-live="polite" aria-label="대화 내용">
        {messages.map((msg) => {
          const recommendations = msg.role === 'assistant' ? parseRecommendations(msg.content) : [];
          const cleanContent = msg.role === 'assistant' ? stripRecommendTags(msg.content) : msg.content;
          const isUser = msg.role === 'user';

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                  isUser
                    ? 'bg-green-700 text-white rounded-br-md'
                    : 'bg-white border-2 border-[color:var(--app-border)] text-gray-800 rounded-bl-md'
                }`}
              >
                <p className="text-senior-body whitespace-pre-wrap">{cleanContent}</p>
                {recommendations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {recommendations.map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(rec.searchQuery)}`)}
                        className="w-full text-left p-3 bg-white rounded-2xl border-2 border-gray-100 hover:border-green-600 transition-colors"
                      >
                        <p className="font-bold text-gray-900 mb-0.5">📖 {rec.title}</p>
                        <p className="text-sm text-gray-600">{rec.author}</p>
                        <p className="text-sm text-gray-500 mt-1">{rec.description}</p>
                      </button>
                    ))}
                  </div>
                )}
                {!isUser && (
                  <button
                    onClick={() => speak(cleanContent)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 transition-colors"
                    aria-label="메시지 읽어주기"
                  >
                    <Volume2 size={18} />
                    <span>읽어주기</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border-2 border-[color:var(--app-border)] rounded-3xl px-5 py-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="fixed left-0 right-0 z-10 app-surface border-t-2 border-[color:var(--app-border)] safe-px"
        style={{ bottom: 'calc(var(--bottom-nav-height) + var(--safe-bottom))' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
          <button
            onClick={handleVoiceInput}
            className={`btn-icon ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
            aria-label={isRecording ? '녹음 중지' : '음성 입력'}
            aria-pressed={isRecording}
          >
            <Mic size={28} />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요"
            className="flex-1 text-senior-body bg-white border-2 border-[color:var(--app-border)] rounded-2xl px-4 py-3 outline-none focus:border-green-600"
            aria-label="메시지 입력"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="btn-icon bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
            aria-label="전송"
          >
            <Send size={28} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
