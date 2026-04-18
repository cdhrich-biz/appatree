import { useEffect, useState } from 'react';
import { Mic, Wrench, LayoutGrid, X, ChevronRight } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';

const FLAG_KEY = 'appatree.onboarded.v1';

type Step = {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  accent: string;
};

const STEPS: Step[] = [
  {
    icon: Mic,
    title: '큰 버튼에 대고 말씀하세요',
    body: '가운데 큰 초록 버튼을 한 번 누르고 듣고 싶은 책을 말씀하시면 찾아드려요',
    accent: 'from-green-500 to-emerald-600',
  },
  {
    icon: Wrench,
    title: '빠른 도구도 준비되어 있어요',
    body: '영상 보기, 후레쉬, 사진, 돋보기를 상단에서 바로 사용하실 수 있어요',
    accent: 'from-sky-500 to-blue-600',
  },
  {
    icon: LayoutGrid,
    title: '카테고리와 즐겨찾기',
    body: '원하시는 장르를 골라 보시거나 즐겨찾기에서 들으시던 책을 다시 들으실 수 있어요',
    accent: 'from-amber-500 to-orange-600',
  },
];

function hasCompleted(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return true;
  }
}

function markCompleted() {
  try {
    localStorage.setItem(FLAG_KEY, '1');
  } catch {
    /* ignore */
  }
}

export default function Onboarding() {
  const { speak } = usePreferences();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasCompleted()) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const s = STEPS[step];
    speak(s.body);
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const finish = () => {
    markCompleted();
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  if (!open) return null;
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 safe-pb"
    >
      <div className="relative w-full max-w-md m-4 rounded-3xl bg-white p-6 shadow-2xl">
        <button
          onClick={finish}
          className="absolute top-3 right-3 btn-icon"
          aria-label="안내 건너뛰기"
        >
          <X size={24} />
        </button>

        <div
          className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${current.accent} text-white flex items-center justify-center mx-auto mb-6`}
          aria-hidden
        >
          <Icon size={56} strokeWidth={2} />
        </div>

        <h2 id="onboarding-title" className="text-senior-heading text-center mb-3">
          {current.title}
        </h2>
        <p
          className="text-senior-body text-gray-700 text-center mb-6 whitespace-pre-line"
          aria-live="polite"
        >
          {current.body}
        </p>

        <div className="flex items-center justify-center gap-2 mb-6" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-green-700' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="btn-primary w-full"
          aria-label={isLast ? '시작하기' : '다음 안내'}
        >
          <span>{isLast ? '시작하기' : '다음'}</span>
          <ChevronRight size={24} />
        </button>

        {!isLast && (
          <button
            onClick={finish}
            className="w-full text-center mt-3 text-senior-body text-gray-500 py-2"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
