import { useState, useEffect } from 'react';
import { Volume2, Type, Trash2, Eye, Gauge, Play, HelpingHand, Users, LinkIcon, LogIn, LogOut } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { session, signOut } = useAuth();
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
        <div className="flex items-center gap-3 mb-4">
          {session ? <LogOut size={28} className="text-green-700" /> : <LogIn size={28} className="text-green-700" />}
          <h2 className="text-senior-heading">로그인</h2>
        </div>
        {session ? (
          <div className="space-y-2">
            <div className="rounded-2xl p-4 border-2 border-green-200 bg-green-50">
              <p className="text-sm text-gray-500">로그인 상태</p>
              <p className="text-senior-body text-green-900 font-semibold truncate">
                {session.user.user_metadata?.nickname ||
                  session.user.user_metadata?.full_name ||
                  session.user.email ||
                  "로그인됨"}
              </p>
            </div>
            <button
              onClick={async () => {
                await signOut();
                toast.success("로그아웃되었어요");
                navigate("/");
              }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-red-200 hover:bg-red-50 transition-colors text-left"
              aria-label="로그아웃"
            >
              <LogOut size={24} className="text-red-500" />
              <span className="text-senior-body text-red-600 font-semibold">로그아웃</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-amber-200 hover:bg-amber-50 transition-colors text-left"
            aria-label="로그인 화면으로 이동"
          >
            <LogIn size={24} className="text-amber-600" />
            <div className="flex-1">
              <p className="text-senior-body text-amber-900 font-semibold">로그인하기</p>
              <p className="text-sm text-gray-600">카카오톡으로 간단하게</p>
            </div>
          </button>
        )}
      </section>

      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Users size={28} className="text-green-700" />
          <h2 className="text-senior-heading">가족 관리</h2>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/help')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-amber-200 hover:bg-amber-50 transition-colors text-left"
            aria-label="자녀에게 도움 요청하기"
          >
            <HelpingHand size={24} className="text-amber-600" />
            <div className="flex-1">
              <p className="text-senior-body text-amber-900 font-semibold">자녀에게 도움 요청</p>
              <p className="text-sm text-gray-600">초대 번호를 만들어 자녀와 연결</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/family/accept')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-green-200 hover:bg-green-50 transition-colors text-left"
            aria-label="부모님 초대 번호로 연결"
          >
            <LinkIcon size={24} className="text-green-700" />
            <div className="flex-1">
              <p className="text-senior-body text-green-900 font-semibold">부모님 연결</p>
              <p className="text-sm text-gray-600">초대 번호를 입력해 부모님과 연결</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/family')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 transition-colors text-left"
            aria-label="연결된 가족 목록"
          >
            <Users size={24} className="text-gray-700" />
            <div className="flex-1">
              <p className="text-senior-body font-semibold">연결된 가족</p>
              <p className="text-sm text-gray-600">목록 보기 · 연결 해제</p>
            </div>
          </button>
        </div>
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
