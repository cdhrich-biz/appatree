import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, Heart, Moon } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

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

  // Parse URL params once
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
  const [volume, setVolume] = useState(70);
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

  // Fetch real video details
  const videoQuery = trpc.youtube.video.useQuery(
    { videoId: params.id },
    { enabled: !!params.id }
  );

  // Update metadata from API response
  useEffect(() => {
    const items = (videoQuery.data?.items as VideoDetail[] | undefined);
    if (items && items.length > 0) {
      const detail = items[0];
      setVideoTitle(detail.snippet.title);
      setVideoChannel(detail.snippet.channelTitle);
    }
  }, [videoQuery.data]);

  // Load YouTube IFrame API and create player
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

            // Seek to saved position
            if (params.startTime > 0) {
              event.target.seekTo(params.startTime, true);
            }

            // Get video detail for history
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

  // Progress tracking
  useEffect(() => {
    progressInterval.current = setInterval(() => {
      if (playerRef.current && isPlaying) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
    return () => clearInterval(progressInterval.current);
  }, [isPlaying]);

  // Save progress every 30 seconds
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

  // Sleep timer
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="뒤로가기">
          <ArrowLeft size={32} className="text-gray-700" />
        </button>
        <div className="flex-1"><h1 className="text-senior-heading text-gray-800">재생 중</h1></div>
        <button onClick={handleBookmark} className="p-2 hover:bg-red-50 rounded-lg transition-colors" aria-label="즐겨찾기">
          <Heart size={28} className={bookmarkMutation.isSuccess ? "text-red-500 fill-red-500" : "text-gray-400"} />
        </button>
      </header>

      <main className="flex-1 flex flex-col px-4 py-6">
        <div className="w-full bg-black rounded-lg overflow-hidden mb-6 aspect-video">
          <div id="yt-player" className="w-full h-full" />
        </div>

        <div className="mb-6">
          <h2 className="text-senior-heading text-gray-800 mb-2">{videoTitle}</h2>
          <p className="text-senior-body text-gray-600">{videoChannel || '로딩 중...'}</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div
            className="bg-gray-200 rounded-full h-3 mb-2 cursor-pointer hover:h-4 transition-all"
            onClick={(e) => {
              if (!playerRef.current || duration === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              const newTime = pct * duration;
              playerRef.current.seekTo(newTime, true);
              setCurrentTime(newTime);
            }}
          >
            <div className="bg-green-700 h-full rounded-full transition-all" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
          <div className="flex justify-between text-senior-body text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center gap-6 mb-8">
            <button onClick={() => handleSkip(-30)} className="p-4 bg-white hover:bg-gray-100 rounded-full transition-colors" aria-label="30초 뒤로">
              <SkipBack size={40} className="text-gray-700" />
            </button>
            <button onClick={handlePlayPause} className="p-6 bg-green-700 hover:bg-green-800 text-white rounded-full transition-colors" aria-label={isPlaying ? '일시정지' : '재생'}>
              {isPlaying ? <Pause size={48} fill="white" /> : <Play size={48} fill="white" />}
            </button>
            <button onClick={() => handleSkip(30)} className="p-4 bg-white hover:bg-gray-100 rounded-full transition-colors" aria-label="30초 앞으로">
              <SkipForward size={40} className="text-gray-700" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-senior-body text-gray-700">재생 속도:</span>
            {[0.75, 1, 1.25].map((rate) => (
              <button key={rate} onClick={() => handleRateChange(rate)} className={`btn-senior-touch ${playbackRate === rate ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border-2 border-gray-300'}`}>
                {rate}x
              </button>
            ))}
          </div>

          {/* Sleep Timer */}
          <div className="flex items-center justify-center gap-3">
            <Moon size={24} className="text-gray-600" />
            <span className="text-senior-body text-gray-700">수면 타이머:</span>
            {[15, 30, 45, 60].map((min) => (
              <button key={min} onClick={() => setSleepTimer(sleepTimer === min ? null : min)} className={`btn-senior-touch text-sm ${sleepTimer === min ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border-2 border-gray-300'}`}>
                {min}분
              </button>
            ))}
            {sleepRemaining > 0 && <span className="text-senior-body text-indigo-600 font-bold">{formatTime(sleepRemaining)}</span>}
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center justify-center gap-4">
          <Volume2 size={32} className="text-gray-600" />
          <input type="range" min="0" max="100" value={volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} className="flex-1 h-3 bg-gray-200 rounded-full cursor-pointer" aria-label="볼륨 조절" />
          <span className="text-senior-body text-gray-700 w-12">{volume}%</span>
        </div>
      </main>
    </div>
  );
}
