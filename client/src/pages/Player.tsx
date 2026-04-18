import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Moon } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { usePreferences } from '@/contexts/PreferencesContext';
import AppShell from '@/components/AppShell';

declare global {
  interface Window {
    YT: { Player: new (el: string, opts: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface VideoSnippet {
  title: string;
  channelTitle: string;
  thumbnails: { high?: { url: string } };
}

interface VideoDetail {
  snippet: VideoSnippet;
  contentDetails: { duration: string };
  statistics: { viewCount: string };
}

export default function Player() {
  const [, navigate] = useLocation();
  const { prefs } = usePreferences();

  const params = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      id: p.get('id') ?? '',
      title: decodeURIComponent(p.get('title') ?? ''),
      startTime: Number(p.get('t') ?? 0),
    };
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(prefs.volume);
  const [videoTitle, setVideoTitle] = useState(params.title);
  const [videoChannel, setVideoChannel] = useState('');
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const saveInterval = useRef<ReturnType<typeof setInterval>>();
  const sleepInterval = useRef<ReturnType<typeof setInterval>>();

  const addHistoryMutation = trpc.library.addHistory.useMutation();
  const updateProgressMutation = trpc.library.updateProgress.useMutation();
  const bookmarkMutation = trpc.library.addBookmark.useMutation();

  const videoQuery = trpc.youtube.video.useQuery(
    { videoId: params.id },
    { enabled: !!params.id }
  );

  useEffect(() => {
    const items = (videoQuery.data?.items as VideoDetail[] | undefined);
    if (items && items.length > 0) {
      const detail = items[0];
      setVideoTitle(detail.snippet.title);
      setVideoChannel(detail.snippet.channelTitle);
    }
  }, [videoQuery.data]);

  useEffect(() => {
    if (!params.id) return;

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: params.id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            const d = event.target.getDuration();
            setDuration(d);
            event.target.setVolume(prefs.volume);
            if (params.startTime > 0) {
              event.target.seekTo(params.startTime, true);
            }
            const items = (videoQuery.data?.items as VideoDetail[] | undefined);
            const detail = items?.[0];
            addHistoryMutation.mutate({
              videoId: params.id,
              title: detail?.snippet.title ?? params.title,
              channelName: detail?.snippet.channelTitle,
              thumbnailUrl: detail?.snippet.thumbnails.high?.url,
              totalSeconds: Math.floor(d),
            });
          },
          onStateChange: (event: { data: number }) => {
            setIsPlaying(event.data === 1);
          },
        },
      } as Record<string, unknown>);
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    return () => {
      playerRef.current?.destroy();
    };
  }, [params.id]);

  useEffect(() => {
    progressInterval.current = setInterval(() => {
      if (playerRef.current && isPlaying) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
    return () => clearInterval(progressInterval.current);
  }, [isPlaying]);

  useEffect(() => {
    if (!params.id) return;
    saveInterval.current = setInterval(() => {
      if (playerRef.current && isPlaying) {
        updateProgressMutation.mutate({
          videoId: params.id,
          progressSeconds: Math.floor(playerRef.current.getCurrentTime()),
          totalSeconds: Math.floor(playerRef.current.getDuration()),
        });
      }
    }, 30000);
    return () => clearInterval(saveInterval.current);
  }, [params.id, isPlaying]);

  useEffect(() => {
    if (sleepTimer === null) {
      clearInterval(sleepInterval.current);
      setSleepRemaining(0);
      return;
    }
    setSleepRemaining(sleepTimer * 60);
    sleepInterval.current = setInterval(() => {
      setSleepRemaining((prev) => {
        if (prev <= 1) {
          playerRef.current?.pauseVideo();
          setSleepTimer(null);
          return 0;
        }
        if (prev <= 30 && playerRef.current) {
          playerRef.current.setVolume(Math.floor((prev / 30) * volume));
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(sleepInterval.current);
  }, [sleepTimer, volume]);

  const handlePlayPause = () => {
    if (isPlaying) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  };

  const handleSkip = (seconds: number) => {
    if (!playerRef.current) return;
    const newTime = Math.max(0, Math.min(duration, playerRef.current.getCurrentTime() + seconds));
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    playerRef.current?.setPlaybackRate(rate);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    playerRef.current?.setVolume(v);
  };

  const handleBookmark = () => {
    if (!params.id) return;
    const items = (videoQuery.data?.items as VideoDetail[] | undefined);
    const detail = items?.[0];
    bookmarkMutation.mutate({
      videoId: params.id,
      title: videoTitle,
      channelName: videoChannel,
      thumbnailUrl: detail?.snippet.thumbnails.high?.url,
      duration: detail?.contentDetails.duration,
    });
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };

  const bookmarked = bookmarkMutation.isSuccess;
  const rateOptions: { value: number; label: string }[] = [
    { value: 0.75, label: '느림' },
    { value: 1, label: '보통' },
    { value: 1.25, label: '빠름' },
  ];

  return (
    <AppShell
      title="재생 중"
      showBack
      hideBottomNav
      headerRight={
        <button
          onClick={handleBookmark}
          className="btn-icon"
          aria-label={bookmarked ? '즐겨찾기 완료' : '즐겨찾기 추가'}
          aria-pressed={bookmarked}
        >
          <Heart size={28} className={bookmarked ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
        </button>
      }
    >
      <div className="w-full bg-black rounded-3xl overflow-hidden aspect-video mb-6 shadow-lg">
        <div id="yt-player" className="w-full h-full" />
      </div>

      <h2 className="text-senior-heading mb-1 line-clamp-2">{videoTitle || '제목을 불러오는 중이에요'}</h2>
      {videoChannel ? (
        <p className="text-senior-body text-gray-600 mb-6">{videoChannel}</p>
      ) : (
        <div className="h-5 bg-gray-200 rounded-md w-40 animate-pulse mb-6" aria-hidden />
      )}

      <div className="mb-6">
        <div
          className="bg-gray-200 rounded-full h-3 cursor-pointer"
          role="slider"
          aria-label="재생 위치"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          onClick={(e) => {
            if (!playerRef.current || duration === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            const newTime = pct * duration;
            playerRef.current.seekTo(newTime, true);
            setCurrentTime(newTime);
          }}
        >
          <div
            className="bg-green-700 h-full rounded-full transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-senior-body text-gray-600 mt-2">
          <span aria-label={`현재 ${formatTime(currentTime)}`}>{formatTime(currentTime)}</span>
          <span aria-label={`전체 ${formatTime(duration)}`}>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mb-8">
        <button
          onClick={() => handleSkip(-30)}
          className="flex flex-col items-center gap-1 p-4 rounded-2xl hover:bg-gray-100 transition-colors"
          aria-label="30초 뒤로"
        >
          <SkipBack size={40} className="text-gray-800" />
          <span className="text-sm font-medium text-gray-600">-30초</span>
        </button>
        <button
          onClick={handlePlayPause}
          className="p-7 rounded-full text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: 'var(--shadow-voice)' }}
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? <Pause size={52} fill="white" /> : <Play size={52} fill="white" />}
        </button>
        <button
          onClick={() => handleSkip(30)}
          className="flex flex-col items-center gap-1 p-4 rounded-2xl hover:bg-gray-100 transition-colors"
          aria-label="30초 앞으로"
        >
          <SkipForward size={40} className="text-gray-800" />
          <span className="text-sm font-medium text-gray-600">+30초</span>
        </button>
      </div>

      <div className="card-senior mb-4">
        <p className="text-senior-body text-gray-700 mb-3">재생 속도</p>
        <div className="flex gap-2">
          {rateOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleRateChange(value)}
              className="btn-secondary flex-1"
              data-active={playbackRate === value}
            >
              {label} ({value}x)
            </button>
          ))}
        </div>
      </div>

      <div className="card-senior mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 size={24} className="text-gray-600" />
          <p className="text-senior-body text-gray-700">음량 {volume}%</p>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-full h-3 accent-green-700"
          aria-label="음량 조절"
        />
      </div>

      <div className="card-senior">
        <div className="flex items-center gap-2 mb-3">
          <Moon size={24} className="text-gray-600" />
          <p className="text-senior-body text-gray-700">수면 타이머</p>
          {sleepRemaining > 0 && (
            <span className="ml-auto text-senior-button text-indigo-600">
              {formatTime(sleepRemaining)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 45, 60].map((min) => (
            <button
              key={min}
              onClick={() => setSleepTimer(sleepTimer === min ? null : min)}
              className="btn-secondary"
              data-active={sleepTimer === min}
            >
              {min}분
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
