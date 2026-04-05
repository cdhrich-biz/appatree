import { useState } from 'react';
import { ArrowLeft, Volume2, Type } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Settings() {
  const [, navigate] = useLocation();
  const [textSize, setTextSize] = useState('medium');
  const [volume, setVolume] = useState(70);
  const [ttsSpeed, setTtsSpeed] = useState(0.9);
  const [autoplay, setAutoplay] = useState(true);

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
          <h1 className="text-senior-heading text-gray-800">설정</h1>
        </div>
      </header>

      {/* Settings Content */}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {/* Text Size Setting */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Type size={32} className="text-gray-700" />
            <h2 className="text-senior-heading text-gray-800">글씨 크기</h2>
          </div>
          <div className="space-y-3">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <label
                key={size}
                className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-600 transition-colors"
              >
                <input
                  type="radio"
                  name="textSize"
                  value={size}
                  checked={textSize === size}
                  onChange={(e) => setTextSize(e.target.value)}
                  className="w-6 h-6 cursor-pointer"
                />
                <span className="ml-4 text-senior-button text-gray-800">
                  {size === 'small' && '작음 (18px)'}
                  {size === 'medium' && '중간 (20px)'}
                  {size === 'large' && '큼 (24px)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Volume Setting */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 size={32} className="text-gray-700" />
            <h2 className="text-senior-heading text-gray-800">음량</h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 h-3 bg-gray-200 rounded-full cursor-pointer"
              aria-label="음량 조절"
            />
            <span className="text-senior-button text-gray-700 w-12">{volume}%</span>
          </div>
        </div>

        {/* TTS Speed Setting */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">음성 속도</h2>
          <div className="space-y-3">
            {[0.75, 0.9, 1.0, 1.25].map((speed) => (
              <label
                key={speed}
                className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-600 transition-colors"
              >
                <input
                  type="radio"
                  name="ttsSpeed"
                  value={speed}
                  checked={ttsSpeed === speed}
                  onChange={(e) => setTtsSpeed(Number(e.target.value))}
                  className="w-6 h-6 cursor-pointer"
                />
                <span className="ml-4 text-senior-button text-gray-800">
                  {speed === 0.75 && '느림 (0.75배)'}
                  {speed === 0.9 && '보통 (0.9배)'}
                  {speed === 1.0 && '표준 (1.0배)'}
                  {speed === 1.25 && '빠름 (1.25배)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Autoplay Setting */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">자동재생</h2>
          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-600 transition-colors">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="w-6 h-6 cursor-pointer"
            />
            <span className="ml-4 text-senior-button text-gray-800">
              다음 오디오북 자동 재생
            </span>
          </label>
        </div>

        {/* About */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-senior-heading text-gray-800 mb-4">정보</h2>
          <div className="space-y-2">
            <p className="text-senior-body text-gray-700">
              <strong>앱 이름:</strong> APPATREE (아빠트리)
            </p>
            <p className="text-senior-body text-gray-700">
              <strong>버전:</strong> 1.0.0
            </p>
            <p className="text-senior-body text-gray-700">
              <strong>설명:</strong> 시니어를 위한 음성 기반 오디오북 검색 및 재생 앱
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full btn-senior-large bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
        >
          저장 및 돌아가기
        </button>
      </main>
    </div>
  );
}
