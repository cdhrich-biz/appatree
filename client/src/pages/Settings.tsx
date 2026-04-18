import { useState, useEffect } from 'react';
import { Volume2, Type, Trash2, Eye, Gauge, Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/AppShell';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Settings() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [volume, setVolume] = useState(70);
  const [ttsSpeed, setTtsSpeed] = useState('0.90');
  const [autoplay, setAutoplay] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmType, setConfirmType] = useState<'history' | 'bookmarks' | null>(null);

  const prefsQuery = trpc.preferences.get.useQuery(undefined, { retry: false });
  const updateMutation = trpc.preferences.update.useMutation();
  const clearHistoryMutation = trpc.library.clearHistory.useMutation();
  const clearBookmarksMutation = trpc.library.clearBookmarks.useMutation();

  useEffect(() => {
    if (prefsQuery.data) {
      const p = prefsQuery.data;
      setTextSize(p.textSize as 'small' | 'medium' | 'large');
      setVolume(p.volume);
      setTtsSpeed(String(p.ttsSpeed));
      setAutoplay(p.autoplay);
      setHighContrast(p.highContrast);
    }
  }, [prefsQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ textSize, volume, ttsSpeed, autoplay, highContrast });
      await queryClient.invalidateQueries({ queryKey: [['preferences', 'get']] });
      navigate('/');
    } finally {
      setIsSaving(false);
    }
  };

  const textSizes: { value: 'small' | 'medium' | 'large'; label: string }[] = [
    { value: 'small', label: '작게' },
    { value: 'medium', label: '보통' },
    { value: 'large', label: '크게' },
  ];

  const speedOptions: { value: string; label: string }[] = [
    { value: '0.75', label: '느림' },
    { value: '0.90', label: '보통' },
    { value: '1.00', label: '표준' },
    { value: '1.25', label: '빠름' },
  ];

  return (
    <AppShell title="설정" showBack>
      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Type size={28} className="text-green-700" />
          <h2 className="text-senior-heading">글씨 크기</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {textSizes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTextSize(value)}
              className="btn-secondary"
              data-active={textSize === value}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Volume2 size={28} className="text-green-700" />
          <h2 className="text-senior-heading">음량</h2>
          <span className="ml-auto text-senior-button text-gray-600">{volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-3 accent-green-700"
          aria-label="음량 조절"
        />
      </section>

      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Gauge size={28} className="text-green-700" />
          <h2 className="text-senior-heading">음성 속도</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {speedOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTtsSpeed(value)}
              className="btn-secondary text-base"
              data-active={ttsSpeed === value}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Play size={28} className="text-green-700" />
          <h2 className="text-senior-heading">자동재생</h2>
        </div>
        <label className="flex items-center gap-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(e) => setAutoplay(e.target.checked)}
            className="w-6 h-6 accent-green-700"
          />
          <span className="text-senior-body">다음 오디오북 이어서 재생</span>
        </label>
      </section>

      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Eye size={28} className="text-green-700" />
          <h2 className="text-senior-heading">고대비 모드</h2>
        </div>
        <label className="flex items-center gap-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            className="w-6 h-6 accent-green-700"
          />
          <span className="text-senior-body">시각 접근성 향상</span>
        </label>
      </section>

      <section className="card-senior mb-4">
        <h2 className="text-senior-heading mb-4">데이터 관리</h2>
        <div className="space-y-2">
          <button
            onClick={() => setConfirmType('history')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={24} className="text-red-500" />
            <span className="text-senior-body text-red-600">재생 이력 삭제</span>
          </button>
          <button
            onClick={() => setConfirmType('bookmarks')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={24} className="text-red-500" />
            <span className="text-senior-body text-red-600">즐겨찾기 전체 삭제</span>
          </button>
        </div>
      </section>

      <section className="card-senior mb-6">
        <h2 className="text-senior-heading mb-3">앱 정보</h2>
        <dl className="space-y-1 text-senior-body text-gray-700">
          <div className="flex justify-between">
            <dt className="text-gray-500">앱 이름</dt>
            <dd>아빠트리</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">버전</dt>
            <dd>1.0.0</dd>
          </div>
        </dl>
      </section>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary w-full"
      >
        {isSaving ? '저장 중...' : '저장하고 돌아가기'}
      </button>

      <ConfirmDialog
        open={confirmType === 'history'}
        title="재생 이력을 모두 삭제할까요?"
        description="이 작업은 되돌릴 수 없어요"
        confirmLabel="네, 삭제해요"
        onConfirm={() => { clearHistoryMutation.mutate(); setConfirmType(null); }}
        onCancel={() => setConfirmType(null)}
      />
      <ConfirmDialog
        open={confirmType === 'bookmarks'}
        title="즐겨찾기를 모두 삭제할까요?"
        description="저장해둔 책이 모두 사라져요"
        confirmLabel="네, 삭제해요"
        onConfirm={() => { clearBookmarksMutation.mutate(); setConfirmType(null); }}
        onCancel={() => setConfirmType(null)}
      />
    </AppShell>
  );
}
