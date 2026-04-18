import { useCallback, useEffect, useRef, useState } from 'react';

export type PlayerVoiceCommand =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'seekForward'
  | 'seekBackward'
  | 'volumeUp'
  | 'volumeDown';

interface CommandMatch {
  command: PlayerVoiceCommand;
  patterns: RegExp[];
  reply: string;
}

const COMMANDS: CommandMatch[] = [
  {
    command: 'pause',
    patterns: [/멈춰/, /일시정지/, /정지/, /멈춤/, /스톱/],
    reply: '일시정지합니다',
  },
  {
    command: 'play',
    patterns: [/재생(?!.*속도)/, /시작(?!.*하기)/, /이어(?:서)?\s*(?:들|재생)/],
    reply: '재생합니다',
  },
  {
    command: 'next',
    patterns: [/다음(?:\s*(?:곡|거|책))?(?!\s*30초)/, /넘겨/, /스킵/],
    reply: '다음 곡으로 넘어갑니다',
  },
  {
    command: 'previous',
    patterns: [/이전(?:\s*(?:곡|거|책))?/, /앞에\s*거/],
    reply: '이전 곡으로 돌아갑니다',
  },
  {
    command: 'seekForward',
    patterns: [/30초\s*(?:앞|뒤로\s*가지\s*말고|지나가|건너)/, /빨리\s*감/, /앞으로/],
    reply: '30초 앞으로 갑니다',
  },
  {
    command: 'seekBackward',
    patterns: [/30초\s*뒤/, /되감/, /뒤로\s*(?:가|돌려)/, /다시\s*들/],
    reply: '30초 뒤로 갑니다',
  },
  {
    command: 'volumeUp',
    patterns: [/(?:소리|볼륨)\s*(?:크게|올려|더|높여)/, /크게/, /더\s*크게/],
    reply: '볼륨을 올립니다',
  },
  {
    command: 'volumeDown',
    patterns: [/(?:소리|볼륨)\s*(?:작게|줄여|내려|낮춰)/, /작게/, /더\s*작게/],
    reply: '볼륨을 낮춥니다',
  },
];

function matchCommand(text: string): CommandMatch | null {
  const trimmed = text.trim();
  for (const c of COMMANDS) {
    if (c.patterns.some((p) => p.test(trimmed))) return c;
  }
  return null;
}

export interface UsePlayerVoiceOptions {
  onCommand: (command: PlayerVoiceCommand) => void;
  onConfirm?: (reply: string) => void;
}

export function usePlayerVoice({ onCommand, onConfirm }: UsePlayerVoiceOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const handlersRef = useRef({ onCommand, onConfirm });

  useEffect(() => {
    handlersRef.current = { onCommand, onConfirm };
  }, [onCommand, onConfirm]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;
        const transcript = event.results[i][0].transcript;
        const matched = matchCommand(transcript);
        if (matched) {
          handlersRef.current.onConfirm?.(matched.reply);
          handlersRef.current.onCommand(matched.command);
        }
      }
    };
    rec.onerror = () => {
      /* no-auto-restart: 사용자가 의도적으로 꺼야만 중단 */
    };
    rec.onend = () => {
      if (recognitionRef.current && listening) {
        try { rec.start(); } catch { /* already started */ }
      }
    };
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      /* already started: 상태만 업데이트 */
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { listening, supported, start, stop, toggle };
}
