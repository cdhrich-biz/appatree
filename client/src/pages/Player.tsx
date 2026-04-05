import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useLocation } from 'wouter';

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

export default function Player() {
  const [, navigate] = useLocation();
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
  });

  const [videoTitle, setVideoTitle] = useState('');
  const [videoChannel, setVideoChannel] = useState('');
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Get video ID from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    if (title) {
      setVideoTitle(decodeURIComponent(title));
      setVideoChannel('YouTube 오디오북');
    }

    // Load YouTube IFrame API
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePlayPause = () => {
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  };

  const handleSkipBack = () => {
    setPlayerState((prev) => ({
      ...prev,
      currentTime: Math.max(0, prev.currentTime - 30),
    }));
  };

  const handleSkipForward = () => {
    setPlayerState((prev) => ({
      ...prev,
      currentTime: Math.min(prev.duration, prev.currentTime + 30),
    }));
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlayerState((prev) => ({
      ...prev,
      playbackRate: rate,
    }));
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/search')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft size={32} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-senior-heading text-gray-800">재생 중</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-6">
        {/* Video Player Area */}
        <div className="w-full bg-black rounded-lg overflow-hidden mb-6 aspect-video">
          <iframe
            ref={iframeRef}
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?playsinline=1"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video Info */}
        <div className="mb-6">
          <h2 className="text-senior-heading text-gray-800 mb-2">{videoTitle}</h2>
          <p className="text-senior-body text-gray-600">{videoChannel}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="bg-gray-200 rounded-full h-3 mb-2 cursor-pointer hover:h-4 transition-all">
            <div
              className="bg-green-700 h-full rounded-full transition-all"
              style={{
                width: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-senior-body text-gray-600">
            <span>{formatTime(playerState.currentTime)}</span>
            <span>{formatTime(playerState.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          {/* Main Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={handleSkipBack}
              className="p-4 bg-white hover:bg-gray-100 rounded-full transition-colors"
              aria-label="30초 뒤로"
            >
              <SkipBack size={40} className="text-gray-700" />
            </button>

            <button
              onClick={handlePlayPause}
              className="p-6 bg-green-700 hover:bg-green-800 text-white rounded-full transition-colors"
              aria-label={playerState.isPlaying ? '일시정지' : '재생'}
            >
              {playerState.isPlaying ? (
                <Pause size={48} fill="white" />
              ) : (
                <Play size={48} fill="white" />
              )}
            </button>

            <button
              onClick={handleSkipForward}
              className="p-4 bg-white hover:bg-gray-100 rounded-full transition-colors"
              aria-label="30초 앞으로"
            >
              <SkipForward size={40} className="text-gray-700" />
            </button>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-senior-body text-gray-700">재생 속도:</span>
            {[0.75, 1, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRateChange(rate)}
                className={`btn-senior-touch ${
                  playerState.playbackRate === rate
                    ? 'bg-green-700 text-white'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-600'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center justify-center gap-4">
          <Volume2 size={32} className="text-gray-600" />
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="70"
            className="flex-1 h-3 bg-gray-200 rounded-full cursor-pointer"
            aria-label="볼륨 조절"
          />
        </div>
      </main>
    </div>
  );
}
