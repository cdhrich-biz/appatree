// 원격 가족 지원 세션 안에서 실행되는 1:1 음성 통화 훅.
// - 시그널링은 Ably 세션 채널 사용 (publish/subscribe via RemoteSessionContext)
// - 미디어는 WebRTC P2P (TURN fallback), 오디오만. 화면/비디오는 사용하지 않음
// - 자녀가 caller, 부모가 callee. 자녀는 활성화 시 자동으로 offer를 보낸다.
// - TURN 미구성 시 STUN만으로 연결 시도, NAT에 막히면 connectionState가 "failed"로 표기된다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";
import type { SessionChannelEvent, WebRTCSignalEvent } from "@shared/remoteEvents";

export type CallState =
  | "idle"
  | "incoming"           // 부모: 오퍼를 받았지만 사용자가 수락 전
  | "requesting-mic"
  | "connecting"
  | "connected"
  | "failed"
  | "ended";

interface UseWebRTCResult {
  callState: CallState;
  muted: boolean;
  micError: string | null;
  hasRemoteAudio: boolean;
  /** 브라우저 autoplay 정책으로 원격 음성 재생이 차단된 상태 */
  audioBlocked: boolean;
  /** 자녀: 통화 시작 / 부모: 대기 중인 오퍼 수락 */
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  /** autoplay 차단 복구 — 사용자 제스처 내에서 호출 */
  resumeAudio: () => Promise<void>;
}

export function useWebRTC(): UseWebRTCResult {
  const { activeSession, subscribe, publish, myUserId } = useRemoteSession();
  const iceQuery = trpc.remote.getIceServers.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    enabled: !!activeSession,
  });

  const [callState, setCallState] = useState<CallState>("idle");
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // 원격 오디오 재생용 audio 엘리먼트를 body에 한 번 생성
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = document.createElement("audio");
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.style.display = "none";
    document.body.appendChild(el);
    remoteAudioRef.current = el;
    return () => {
      try {
        el.pause();
      } catch {
        // ignore
      }
      try {
        el.remove();
      } catch {
        // ignore
      }
      remoteAudioRef.current = null;
    };
  }, []);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    setHasRemoteAudio(false);
  }, []);

  const endCall = useCallback(() => {
    cleanup();
    setCallState("ended");
    setMuted(false);
  }, [cleanup]);

  // 세션이 끝나면 통화도 정리
  useEffect(() => {
    if (!activeSession) {
      cleanup();
      setCallState("idle");
    }
  }, [activeSession, cleanup]);

  const makePeer = useCallback((): RTCPeerConnection | null => {
    const iceServers = iceQuery.data?.iceServers ?? [{ urls: "stun:stun.l.google.com:19302" }];
    const pc = new RTCPeerConnection({ iceServers: iceServers as RTCIceServer[] });

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "connected" || s === "completed") {
        setCallState("connected");
      } else if (s === "failed" || s === "disconnected") {
        setCallState("failed");
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      setHasRemoteAudio(true);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().then(
          () => setAudioBlocked(false),
          (err) => {
            // 브라우저 autoplay 정책으로 막힘 — UI가 resumeAudio 버튼 노출
            console.warn("[webrtc] remote audio play blocked", err);
            setAudioBlocked(true);
          },
        );
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !myUserId) return;
      void publish({
        type: "webrtc:ice",
        candidate: event.candidate.toJSON(),
        from: myUserId,
      });
    };

    return pc;
  }, [iceQuery.data, publish, myUserId]);

  const getLocalAudio = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setCallState("requesting-mic");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      setMicError(null);
      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : "마이크 접근이 거부되었어요";
      setMicError(message);
      setCallState("failed");
      return null;
    }
  }, []);

  // 자녀: caller로 offer 송신 / 부모: pending offer 수락하며 answer 송신
  const startCall = useCallback(async () => {
    if (!activeSession || !myUserId) return;
    if (callState === "connecting" || callState === "connected" || callState === "requesting-mic") return;

    const stream = await getLocalAudio();
    if (!stream) return;
    localStreamRef.current = stream;

    const pc = makePeer();
    if (!pc) return;
    pcRef.current = pc;
    stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
    setCallState("connecting");

    try {
      if (activeSession.role === "child") {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await publish({ type: "webrtc:offer", sdp: offer, from: myUserId });
      } else {
        // 부모: 대기 중인 오퍼를 가져와 answer 생성
        const pending = pendingOfferRef.current;
        if (!pending) {
          // 아직 오퍼 도착 전 — 오퍼가 오면 이 pc에 바로 setRemoteDescription 할 수 있도록 유지
          return;
        }
        await pc.setRemoteDescription(pending);
        pendingOfferRef.current = null;
        for (const cand of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(cand);
          } catch {
            // ignore
          }
        }
        pendingCandidatesRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await publish({ type: "webrtc:answer", sdp: answer, from: myUserId });
      }
    } catch (err) {
      console.warn("[webrtc] startCall failed", err);
      cleanup();
      setCallState("failed");
    }
  }, [activeSession, myUserId, callState, getLocalAudio, makePeer, publish, cleanup]);

  // Signaling 수신 핸들러 (양쪽 공통)
  useEffect(() => {
    if (!activeSession || !myUserId) return;
    const off = subscribe(async (event: SessionChannelEvent) => {
      const signal = event as WebRTCSignalEvent;
      if (!signal.type.startsWith("webrtc:")) return;
      if (signal.from === myUserId) return; // 자신이 보낸 시그널 무시

      try {
        if (signal.type === "webrtc:offer") {
          if (activeSession.role !== "parent") return;
          // 부모가 이미 통화를 수락한 경우: 즉시 answer 보냄
          if (pcRef.current && localStreamRef.current) {
            await pcRef.current.setRemoteDescription(signal.sdp);
            for (const cand of pendingCandidatesRef.current) {
              try {
                await pcRef.current.addIceCandidate(cand);
              } catch {
                // ignore
              }
            }
            pendingCandidatesRef.current = [];
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            await publish({ type: "webrtc:answer", sdp: answer, from: myUserId });
          } else {
            // 사용자 제스처 대기 — 오퍼 저장해두고 callState를 "incoming"으로
            pendingOfferRef.current = signal.sdp;
            setCallState("incoming");
          }
        } else if (signal.type === "webrtc:answer") {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(signal.sdp);
          for (const cand of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(cand);
            } catch {
              // ignore
            }
          }
          pendingCandidatesRef.current = [];
        } else if (signal.type === "webrtc:ice") {
          const pc = pcRef.current;
          if (!pc || !pc.remoteDescription) {
            pendingCandidatesRef.current.push(signal.candidate);
            return;
          }
          try {
            await pc.addIceCandidate(signal.candidate);
          } catch (err) {
            console.warn("[webrtc] addIceCandidate failed", err);
          }
        }
      } catch (err) {
        console.warn("[webrtc] signaling error", err);
        setCallState("failed");
      }
    });
    return off;
  }, [activeSession, myUserId, subscribe, getLocalAudio, makePeer, publish]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const resumeAudio = useCallback(async () => {
    if (!remoteAudioRef.current) return;
    try {
      await remoteAudioRef.current.play();
      setAudioBlocked(false);
    } catch (err) {
      console.warn("[webrtc] resumeAudio failed", err);
    }
  }, []);

  return useMemo(
    () => ({ callState, muted, micError, hasRemoteAudio, audioBlocked, startCall, endCall, toggleMute, resumeAudio }),
    [callState, muted, micError, hasRemoteAudio, audioBlocked, startCall, endCall, toggleMute, resumeAudio],
  );
}
