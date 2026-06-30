// 홈 화면 바로가기(PWA "홈 화면에 추가") 상태/실행 훅.
// - Android·Chromium: beforeinstallprompt 를 미리 캡처했다가 버튼 클릭 시 prompt()
// - iOS: 자동 프롬프트 미지원 → 수동 안내 필요 (platform === 'ios')
// - 그 외/프롬프트 미보유: 브라우저 메뉴 수동 안내 (platform === 'other')
// - 이미 standalone 으로 실행 중이면 안내 불필요 (isStandalone)

import { useCallback, useEffect, useState } from "react";

// 표준 TS lib 에 아직 포함되지 않은 이벤트 — 최소 형태로 직접 정의
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

type InstallPlatform = "installable" | "ios" | "other";

function detectIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ 는 데스크톱 UA로 위장 → 터치 가능한 Mac 으로 보정 감지
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

export interface AddToHomeScreenState {
  /** 이미 홈 화면 앱(standalone)으로 실행 중인지 — true 면 안내 불필요 */
  isStandalone: boolean;
  /**
   * 'installable': 앱 내 버튼으로 즉시 설치 프롬프트 가능 (Android/Chromium)
   * 'ios': iOS — '공유 → 홈 화면에 추가' 수동 안내 필요
   * 'other': 설치 프롬프트 미보유 — 브라우저 메뉴 수동 안내
   */
  platform: InstallPlatform;
  /** Android/Chromium 설치 프롬프트 실행 (결과로 분기) */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export function useAddToHomeScreen(): AddToHomeScreenState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const isIOS = detectIsIOS();

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // 브라우저 기본 미니 인포바를 막고, 버튼 클릭 시점까지 보관
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null); // 프롬프트는 1회용
    return choice.outcome;
  }, [deferred]);

  const platform: InstallPlatform = deferred ? "installable" : isIOS ? "ios" : "other";

  return { isStandalone, platform, promptInstall };
}
