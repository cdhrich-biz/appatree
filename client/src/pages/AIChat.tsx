import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Mic, Volume2 } from 'lucide-react';
import { useLocation } from 'wouter';

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

export default function AIChat() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ko-KR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };
    }

    // Add initial greeting message
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content: '안녕하세요! 저는 당신의 오디오북 추천 도우미입니다. 어떤 책을 찾고 계신가요?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Auto-scroll to bottom
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
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setInputValue(transcript);
        }
      };
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (TODO: integrate with OpenAI API)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `당신이 "${inputValue}"에 관심이 있으신 것 같네요. 저는 다음 책들을 추천드립니다:\n\n📖 추천 오디오북 1\n저자: 홍길동\n설명: 감동적인 이야기로 마음을 따뜻하게 해주는 책입니다.\n\n📖 추천 오디오북 2\n저자: 김영희\n설명: 인생의 지혜를 담은 따뜻한 에세이입니다.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      speakMessage('추천 오디오북을 찾았습니다. 화면을 확인해주세요.');
      setIsLoading(false);
    }, 1500);
  };

  const presetMessages = [
    '오늘 듣기 좋은 책 추천해주세요',
    '감동적인 이야기를 찾고 있어요',
    '역사 관련 책을 추천해주세요',
    '편안한 마음으로 들을 수 있는 책은?',
  ];

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
          <h1 className="text-senior-heading text-gray-800">AI 채팅</h1>
          <p className="text-senior-body text-gray-600">오디오북 추천 상담</p>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-senior-body text-gray-600 mb-6 text-center">
              안녕하세요! 어떤 책을 찾고 계신가요?
            </p>
            <div className="w-full space-y-3">
              {presetMessages.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(msg)}
                  className="w-full list-item-senior bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg p-4 text-left transition-all"
                >
                  <p className="text-senior-body text-gray-800">{msg}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-green-700 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="text-senior-body whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => speakMessage(message.content)}
                      className="mt-2 p-2 hover:bg-gray-200 rounded transition-colors"
                      aria-label="메시지 읽어주기"
                    >
                      <Volume2 size={20} className="text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex gap-3 mb-3">
          <div className="flex-1 flex items-center bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              placeholder="메시지 입력..."
              className="flex-1 text-senior-body outline-none bg-transparent"
            />
          </div>
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-600 text-white'
                : 'bg-green-700 hover:bg-green-800 text-white'
            }`}
            aria-label="음성 입력"
          >
            <Mic size={24} />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg transition-colors"
            aria-label="메시지 전송"
          >
            <Send size={24} />
          </button>
        </div>

        {/* Preset Messages */}
        {messages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {presetMessages.map((msg, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(msg);
                }}
                className="btn-senior-touch whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-gray-800 border-2 border-gray-300 transition-colors"
              >
                {msg.substring(0, 12)}...
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
