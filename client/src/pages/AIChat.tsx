import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Mic, Volume2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const greetingQuery = trpc.chat.greeting.useQuery(undefined, { retry: false });
  const sendMutation = trpc.chat.send.useMutation();

  // Initialize Web Speech API
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

  // Set initial greeting
  useEffect(() => {
    const greeting = greetingQuery.data ?? '안녕하세요! 저는 당신의 오디오북 추천 도우미입니다. 어떤 책을 찾고 계신가요?';
    setMessages([{ id: '0', role: 'assistant', content: greeting, timestamp: new Date() }]);
  }, [greetingQuery.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakMessage = (message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

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
      speakMessage(stripRecommendTags(result.message).slice(0, 200));
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="뒤로가기">
          <ArrowLeft size={32} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-senior-heading text-gray-800">AI 채팅</h1>
          <p className="text-senior-body text-gray-600">오디오북 추천 상담</p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {messages.length <= 1 && (
          <div className="mb-6">
            <p className="text-senior-body text-gray-600 mb-4">추천 질문:</p>
            <div className="grid grid-cols-1 gap-2">
              {presetMessages.map((msg) => (
                <button key={msg} onClick={() => { setInputValue(msg); }} className="text-left p-4 bg-gray-50 hover:bg-green-50 border-2 border-gray-200 hover:border-green-600 rounded-lg text-senior-body text-gray-700 transition-all">
                  {msg}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => {
            const recommendations = msg.role === 'assistant' ? parseRecommendations(msg.content) : [];
            const cleanContent = msg.role === 'assistant' ? stripRecommendTags(msg.content) : msg.content;

            return (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-4 ${msg.role === 'user' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  <p className="text-senior-body whitespace-pre-wrap">{cleanContent}</p>
                  {recommendations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {recommendations.map((rec, i) => (
                        <button
                          key={i}
                          onClick={() => navigate(`/search?q=${encodeURIComponent(rec.searchQuery)}`)}
                          className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-green-600 transition-colors"
                        >
                          <p className="font-bold text-gray-800">📖 {rec.title}</p>
                          <p className="text-sm text-gray-600">{rec.author}</p>
                          <p className="text-sm text-gray-500 mt-1">{rec.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' && (
                    <button onClick={() => speakMessage(cleanContent)} className="mt-2 p-1 hover:bg-gray-200 rounded" aria-label="읽어주기">
                      <Volume2 size={20} className="text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-lg transition-colors ${isRecording ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            aria-label="음성 입력"
          >
            <Mic size={28} />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 text-senior-body border-2 border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-green-600"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg transition-colors"
            aria-label="전송"
          >
            <Send size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
