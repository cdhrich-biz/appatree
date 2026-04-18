import { useLocation } from 'wouter';
import AppShell from '@/components/AppShell';

const VIDEO_CATEGORIES = [
  { icon: '📺', name: '뉴스', query: '오늘의 뉴스' },
  { icon: '🏃', name: '건강 · 운동', query: '어르신 건강체조' },
  { icon: '🎵', name: '트로트', query: '트로트 모음' },
  { icon: '📖', name: '다큐', query: '역사 다큐멘터리' },
  { icon: '🍳', name: '요리', query: '집밥 요리법' },
  { icon: '🙏', name: '종교', query: '설교 말씀' },
] as const;

export default function VideoHome() {
  const [, navigate] = useLocation();

  return (
    <AppShell title="영상 보기" subtitle="보고 듣는 영상 모음" showBack>
      <p className="text-senior-body text-gray-600 mb-4">
        원하는 영상을 골라 주세요
      </p>
      <div className="grid grid-cols-2 gap-4">
        {VIDEO_CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            onClick={() => navigate(`/search?q=${encodeURIComponent(cat.query)}`)}
            className="tile-senior"
            aria-label={`${cat.name} 영상 보기`}
          >
            <span className="text-5xl" aria-hidden>{cat.icon}</span>
            <span className="text-senior-button">{cat.name}</span>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
