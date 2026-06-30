// 설정 화면에 들어가는 "홈 화면 바로가기 만들기" 섹션.
// - Android/Chromium: 버튼 한 번으로 네이티브 설치 프롬프트
// - iOS / 기타: 시니어 친화 단계별 그림 안내 모달
// 시각 저하 어르신 대상 — 큰 글씨/큰 버튼/그림/TTS 안내.

import { useEffect, useState } from "react";
import { Smartphone, Plus, Share, SquarePlus, MoreVertical, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useAddToHomeScreen } from "@/hooks/useAddToHomeScreen";

type GuideKind = "ios" | "other";

interface GuideStep {
  icon: React.ReactNode;
  text: React.ReactNode;
}

const GUIDE_STEPS: Record<GuideKind, GuideStep[]> = {
  ios: [
    {
      icon: <Share size={40} className="text-green-700" />,
      text: (
        <>
          화면 아래쪽의 <strong>공유 버튼</strong>
          <span className="text-gray-500">(네모 위에 화살표 모양)</span>을 누르세요
        </>
      ),
    },
    {
      icon: <SquarePlus size={40} className="text-green-700" />,
      text: (
        <>
          목록에서 <strong>"홈 화면에 추가"</strong>를 누르세요
        </>
      ),
    },
    {
      icon: <CheckCircle2 size={40} className="text-green-700" />,
      text: (
        <>
          오른쪽 위 <strong>"추가"</strong>를 누르면 끝나요
        </>
      ),
    },
  ],
  other: [
    {
      icon: <MoreVertical size={40} className="text-green-700" />,
      text: (
        <>
          오른쪽 위 <strong>메뉴 버튼</strong>
          <span className="text-gray-500">(점 세 개 모양)</span>을 누르세요
        </>
      ),
    },
    {
      icon: <SquarePlus size={40} className="text-green-700" />,
      text: (
        <>
          <strong>"홈 화면에 추가"</strong> 또는 <strong>"앱 설치"</strong>를 누르세요
        </>
      ),
    },
    {
      icon: <CheckCircle2 size={40} className="text-green-700" />,
      text: (
        <>
          <strong>"추가"</strong>를 누르면 끝나요
        </>
      ),
    },
  ],
};

function InstallGuide({ kind, onClose }: { kind: GuideKind; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const steps = GUIDE_STEPS[kind];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a2hs-guide-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 safe-pb"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md m-4 rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="a2hs-guide-title" className="text-senior-heading">
            홈 화면에 바로가기 만들기
          </h2>
          <button onClick={onClose} className="btn-icon -mr-2" aria-label="닫기">
            <X size={28} />
          </button>
        </div>

        <ol className="space-y-4 mb-6">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-4">
              <span
                className="flex items-center justify-center w-10 h-10 rounded-full bg-green-700 text-white text-senior-button font-bold flex-shrink-0"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="flex-shrink-0" aria-hidden>
                {step.icon}
              </span>
              <span className="text-senior-body text-gray-800">{step.text}</span>
            </li>
          ))}
        </ol>

        <button onClick={onClose} className="btn-primary w-full">
          알겠어요
        </button>
      </div>
    </div>
  );
}

export default function AddToHomeScreen() {
  const { isStandalone, platform, promptInstall } = useAddToHomeScreen();
  const { speak } = usePreferences();
  const [guide, setGuide] = useState<GuideKind | null>(null);

  // 이미 홈 화면 앱으로 실행 중이면 안내 대신 완료 상태만 표시
  if (isStandalone) {
    return (
      <section className="card-senior mb-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={28} className="text-green-700" aria-hidden />
          <div>
            <h2 className="text-senior-heading">홈 화면 바로가기</h2>
            <p className="text-senior-body text-gray-600">이미 홈 화면에 바로가기가 있어요</p>
          </div>
        </div>
      </section>
    );
  }

  const handleClick = async () => {
    if (platform === "installable") {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success("홈 화면에 바로가기를 만들었어요");
        speak("홈 화면에 바로가기를 만들었어요");
        return;
      }
      if (outcome === "dismissed") return; // 사용자가 직접 취소 → 추가 안내 불필요
      setGuide("other"); // unavailable → 수동 안내로 폴백
      return;
    }
    setGuide(platform === "ios" ? "ios" : "other");
    speak("화면의 안내를 따라 홈 화면에 바로가기를 만들어 주세요");
  };

  return (
    <>
      <section className="card-senior mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Smartphone size={28} className="text-green-700" aria-hidden />
          <h2 className="text-senior-heading">홈 화면 바로가기</h2>
        </div>
        <p className="text-senior-body text-gray-600 mb-4">
          자주 쓰는 아빠트리를 휴대폰 첫 화면에 큰 아이콘으로 만들어요.
        </p>
        <button
          onClick={handleClick}
          className="btn-primary w-full flex items-center justify-center gap-3"
          aria-label="홈 화면에 바로가기 버튼 만들기"
        >
          <Plus size={26} strokeWidth={2.6} />
          <span>바로가기 버튼 만들기</span>
        </button>
      </section>

      {guide && <InstallGuide kind={guide} onClose={() => setGuide(null)} />}
    </>
  );
}
