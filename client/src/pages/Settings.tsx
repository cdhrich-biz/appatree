import { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Type, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

export default function Settings() {
  const [, navigate] = useLocation();
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [volume, setVolume] = useState(70);
  const [ttsSpeed, setTtsSpeed] = useState('0.90');
  const [autoplay, setAutoplay] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      navigate('/');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="뒤로가기">
          <ArrowLeft size={32} className="text-gray-700" />
        </button>
        <div className="flex-1"><h1 className="text-senior-heading text-gray-800">설정</h1></div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {/* Text Size */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Type size={32} className="text-gray-700" />
            <h2 className="text-senior-heading text-gray-800">글씨 크기</h2>
          </div>
          <div className="space-y-3">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <label key={size} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-600 transition-colors">
                <input type="radio" name="textSize" value={size} checked={textSize === size} onChange={() => setTextSize(size)} className="w-6 h-6 cursor-pointer" />
                <span className="ml-4 text-senior-button text-gray-800">
                  {size === 'small' && '작음 (18px)'}
                  {size === 'medium' && '중간 (20px)'}
                  {size === 'large' && '큼 (24px)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 size={32} className="text-gray-700" />
            <h2 className="text-senior-heading text-gray-800">음량</h2>
          </div>
          <div className="flex items-center gap-4">
            <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1 h-3 bg-gray-200 rounded-full cursor-pointer" aria-label="음량 조절" />
            <span className="text-senior-button text-gray-700 w-12">{volume}%</span>
          </div>
        </div>

        {/* TTS Speed */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">음성 속도</h2>
          <div className="space-y-3">
            {[{ value: '0.75', label: '느림 (0.75배)' }, { value: '0.90', label: '보통 (0.9배)' }, { value: '1.00', label: '표준 (1.0배)' }, { value: '1.25', label: '빠름 (1.25배)' }].map(({ value, label }) => (
              <label key={value} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-600 transition-colors">
                <input type="radio" name="ttsSpeed" value={value} checked={ttsSpeed === value} onChange={() => setTtsSpeed(value)} className="w-6 h-6 cursor-pointer" />
                <span className="ml-4 text-senior-button text-gray-800">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Autoplay */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">자동재생</h2>
          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-600 transition-colors">
            <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} className="w-6 h-6 cursor-pointer" />
            <span className="ml-4 text-senior-button text-gray-800">다음 오디오북 자동 재생</span>
          </label>
        </div>

        {/* High Contrast */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">고대비 모드</h2>
          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-600 transition-colors">
            <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} className="w-6 h-6 cursor-pointer" />
            <span className="ml-4 text-senior-button text-gray-800">고대비 모드 (시각 접근성 향상)</span>
          </label>
        </div>

        {/* Data Management */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">데이터 관리</h2>
          <div className="space-y-3">
            <button
              onClick={() => { if (confirm('재생 이력을 모두 삭제하시겠습니까?')) clearHistoryMutation.mutate(); }}
              className="w-full flex items-center gap-3 p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={24} className="text-red-500" />
              <span className="text-senior-button text-red-600">재생 이력 삭제</span>
            </button>
            <button
              onClick={() => { if (confirm('즐겨찾기를 모두 삭제하시겠습니까?')) clearBookmarksMutation.mutate(); }}
              className="w-full flex items-center gap-3 p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={24} className="text-red-500" />
              <span className="text-senior-button text-red-600">즐겨찾기 전체 삭제</span>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">정보</h2>
          <div className="space-y-2">
            <p className="text-senior-body text-gray-700"><strong>앱 이름:</strong> APPATREE (아빠트리)</p>
            <p className="text-senior-body text-gray-700"><strong>버전:</strong> 1.0.0</p>
            <p className="text-senior-body text-gray-700"><strong>설명:</strong> 시니어를 위한 음성 기반 오디오북 검색 및 재생 앱</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full btn-senior-large bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장 및 돌아가기'}
        </button>
      </main>
    </div>
  );
}
