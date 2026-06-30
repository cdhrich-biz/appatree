import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Moon, ChevronLeft, ChevronRight, Mic, MicOff } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { usePreferences } from '@/contexts/PreferencesContext';
import AppShell from '@/components/AppShell';
import { playbackQueue, type QueueItem } from '@/lib/playbackQueue';
import { usePlayerVoice, type PlayerVoiceCommand } from '@/hooks/usePlayerVoice';
import { toast } from 'sonner';

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
  loadVideoById(videoId: string): void;
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
  const { prefs, speak } = usePreferences();

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
  const [currentVideoId, setCurrentVideoId] = useState(params.id);
  const [nextItem, setNextItem] = useState<QueueItem | null>(null);
  const [prevItem, setPrevItem] = useState<QueueItem | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const saveInterval = useRef<ReturnType<typeof setInterval>>();
  const sleepInterval = useRef<ReturnType<typeof setInterval>>();
  const historyRecordedFor = useRef<string>('');
  const autoplayOnReadyRef = useRef<boolean>(false);

  const addHistoryMutation = trpc.library.addHistory.useMutation();
  const updateProgressMutation = trpc.library.updateProgress.useMutation();
  const bookmarkMutation = trpc.library.addBookmark.useMutation();

  const videoQuery = trpc.youtube.video.useQuery(
    { videoId: currentVideoId },
    { enabled: !!currentVideoId }
  );

  // 큐 위치를 현재 재생 ID에 동기화 + 다음/이전 미리보기 갱신
  useEffect(() => {
    if (!currentVideoId) return;
    playbackQueue.alignTo(currentVideoId);
    setNextItem(playbackQueue.getNext());
    setPrevItem(playbackQueue.getPrevious());
  }, [currentVideoId]);

  useEffect(() => {
    const items = (videoQuery.data?.items as VideoDetail[] | undefined);
    if (items && items.length > 0) {
      const detail = items[0];
      setVideoTitle(detail.snippet.title);
      setVideoChannel(detail.snippet.channelTitle);
      if (historyRecordedFor.current !== currentVideoId) {
        historyRecordedFor.current = currentVideoId;
        addHistoryMutation.mutate({
          videoId: currentVideoId,
          title: detail.snippet.title,
          channelName: detail.snippet.channelTitle,
          thumbnailUrl: detail.snippet.thumbnails.high?.url,
          totalSeconds: Math.floor(duration),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoQuery.data, currentVideoId]);

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
          },
          onStateChange: (event: { data: number }) => {
            setIsPlaying(event.data === 1);
            // 0 = ended → 자동 다음 (autoplay on)
            if (event.data === 0 && prefs.autoplay) {
              const nxt = playbackQueue.advance();
              if (nxt) {
                autoplayOnReadyRef.current = true;
                playerRef.current?.loadVideoById(nxt.videoId);
                setCurrentVideoId(nxt.videoId);
                setVideoTitle(nxt.title);
                setVideoChannel(nxt.channelName ?? '');
                window.history.replaceState(
                  null,
                  '',
                  `/player?id=${nxt.videoId}&title=${encodeURIComponent(nxt.title)}`,
                );
                speak('다음 곡을 재생합니다');
              }
            }
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
    if (!currentVideoId) return;
    saveInterval.current = setInterval(() => {
      if (playerRef.current && isPlaying) {
        updateProgressMutation.mutate({
          videoId: currentVideoId,
          progressSeconds: Math.floor(playerRef.current.getCurrentTime()),
          totalSeconds: Math.floor(playerRef.current.getDuration()),
        });
      }
    }, 30000);
    return () => clearInterval(saveInterval.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoId, isPlaying]);

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

  const handlePlayPause = useCallback(() => {
    if (isPlaying) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  }, [isPlaying]);

  const handleSkip = useCallback(
    (seconds: number) => {
      if (!playerRef.current) return;
      const newTime = Math.max(
        0,
        Math.min(duration, playerRef.current.getCurrentTime() + seconds),
      );
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    },
    [duration],
  );

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    playerRef.current?.setPlaybackRate(rate);
  };

  const handleVolumeChange = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolume(clamped);
    playerRef.current?.setVolume(clamped);
  }, []);

  const loadQueueItem = useCallback((item: QueueItem) => {
    if (!playerRef.current) return;
    playerRef.current.loadVideoById(item.videoId);
    setCurrentVideoId(item.videoId);
    setVideoTitle(item.title);
    setVideoChannel(item.channelName ?? '');
    setCurrentTime(0);
    window.history.replaceState(
      null,
      '',
      `/player?id=${item.videoId}&title=${encodeURIComponent(item.title)}`,
    );
  }, []);

  const handleNext = useCallback(() => {
    const nxt = playbackQueue.advance();
    if (nxt) {
      loadQueueItem(nxt);
      speak('다음 곡으로 넘어갑니다');
    } else {
      toast.info('더 들을 곡이 없어요');
    }
  }, [loadQueueItem, speak]);

  const handlePrevious = useCallback(() => {
    const prv = playbackQueue.retreat();
    if (prv) {
      loadQueueItem(prv);
      speak('이전 곡으로 돌아갑니다');
    } else {
      toast.info('이전 곡이 없어요');
    }
  }, [loadQueueItem, speak]);

  const handleBookmark = () => {
    if (!currentVideoId) return;
    const items = (videoQuery.data?.items as VideoDetail[] | undefined);
    const detail = items?.[0];
    bookmarkMutation.mutate({
      videoId: currentVideoId,
      title: videoTitle,
      channelName: videoChannel,
      thumbnailUrl: detail?.snippet.thumbnails.high?.url,
      duration: detail?.contentDetails.duration,
    });
  };

  // 음성 명령 핸들러
  const handleVoiceCommand = useCallback(
    (cmd: PlayerVoiceCommand) => {
      switch (cmd) {
        case 'play':
          playerRef.current?.playVideo();
          break;
        case 'pause':
          playerRef.current?.pauseVideo();
          break;
        case 'next':
          handleNext();
          break;
        case 'previous':
          handlePrevious();
          break;
        case 'seekForward':
          handleSkip(30);
          break;
        case 'seekBackward':
          handleSkip(-30);
          break;
        case 'volumeUp':
          handleVolumeChange(volume + 10);
          break;
        case 'volumeDown':
          handleVolumeChange(volume - 10);
          break;
      }
    },
    [handleNext, handlePrevious, handleSkip, handleVolumeChange, volume],
  );

  const voice = usePlayerVoice({
    onCommand: handleVoiceCommand,
    onConfirm: (reply) => speak(reply),
  });

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
        <>
          {voice.supported && (
            <button
              onClick={voice.toggle}
              className="btn-icon relative"
              aria-label={voice.listening ? '음성 명령 끄기' : '음성 명령 켜기'}
              aria-pressed={voice.listening}
              title={voice.listening ? '음성 제어 중' : '음성 제어 켜기'}
            >
              {voice.listening ? (
                <>
                  <Mic size={28} className="text-red-500" />
                  <span
                    className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"
                    aria-hidden
                  />
                </>
              ) : (
                <MicOff size={28} className="text-gray-500" />
              )}
            </button>
          )}
          <button
            onClick={handleBookmark}
            className="btn-icon"
            aria-label={bookmarked ? '즐겨찾기 완료' : '즐겨찾기 추가'}
            aria-pressed={bookmarked}
          >
            <Heart size={28} className={bookmarked ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
          </button>
        </>
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

      <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4">
        <button
          onClick={() => handleSkip(-30)}
          className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-gray-100 transition-colors"
          aria-label="30초 뒤로"
        >
          <SkipBack size={36} className="text-gray-800" />
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
          className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-gray-100 transition-colors"
          aria-label="30초 앞으로"
        >
          <SkipForward size={36} className="text-gray-800" />
          <span className="text-sm font-medium text-gray-600">+30초</span>
        </button>
      </div>

      {(prevItem || nextItem) && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={handlePrevious}
            disabled={!prevItem}
            className="btn-secondary flex-1 disabled:opacity-40"
            aria-label={prevItem ? `이전: ${prevItem.title}` : '이전 곡 없음'}
          >
            <ChevronLeft size={24} />
            <span>이전 곡</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!nextItem}
            className="btn-secondary flex-1 disabled:opacity-40"
            aria-label={nextItem ? `다음: ${nextItem.title}` : '다음 곡 없음'}
          >
            <span>다음 곡</span>
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {nextItem && (
        <div className="card-senior mb-4">
          <p className="text-sm text-gray-500 mb-2">다음 재생</p>
          <div className="flex items-center gap-3">
            {nextItem.thumbnailUrl ? (
              <img
                src={nextItem.thumbnailUrl}
                alt=""
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                🎧
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-senior-body font-semibold line-clamp-2">{nextItem.title}</p>
              {nextItem.channelName && (
                <p className="text-sm text-gray-500 truncate">{nextItem.channelName}</p>
              )}
            </div>
          </div>
        </div>
      )}

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
