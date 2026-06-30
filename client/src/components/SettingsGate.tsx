// 설정 안전 게이트 (시니어 오클릭 방지).
// 무심결에 설정에 들어와도 실제 설정 변경 전에 "의도 확인" 1단계를 거치게 한다.
// - 최상단 큰 [돌아가기] 버튼 → 잘못 들어온 경우 즉시 탈출
// - 화면에 표시된 안내 숫자(GATE_CODE)를 그대로 입력 → "설정하기"로만 통과
//   (기억이 아니라 보고 따라 쓰기 — 시각 저하 어르신 인지 부담 최소화)
// 보안 목적이 아니라 의도 확인(intent gate)이므로 난수가 아닌 고정 안내 숫자 사용.

import { useEffect, useRef, useState } from "react";
import { X, KeyRound, Volume2 } from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";

const GATE_CODE = "1234";

interface SettingsGateProps {
  /** 게이트 통과 (안내 숫자 일치 + 설정하기) */
  onPass: () => void;
  /** 게이트 탈출 (잘못 들어옴) */
  onExit: () => void;
}

export default function SettingsGate({ onPass, onExit }: SettingsGateProps) {
  const { speak } = usePreferences();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const guideVoice = `설정을 바꾸려면 화면의 숫자 ${GATE_CODE.split("").join(", ")}를 입력하고, 설정하기를 누르세요. 잘못 들어오셨다면 맨 위 돌아가기를 누르세요.`;

  useEffect(() => {
    try {
      speak(guideVoice);
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matched = value.trim() === GATE_CODE;

  const handleSubmit = () => {
    if (matched) {
      onPass();
      return;
    }
    setError(true);
    setValue("");
    try {
      speak("숫자를 다시 확인해 주세요");
    } catch {
      /* noop */
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex flex-col">
      {/* 최상단 큰 돌아가기 — 잘못 들어온 경우 즉시 탈출 */}
      <button
        onClick={onExit}
        className="w-full flex items-center justify-center gap-3 rounded-2xl p-5 mb-6 border-2 border-gray-300 bg-white"
        style={{ minHeight: 80 }}
        aria-label="설정에서 나가 이전 화면으로 돌아가기"
      >
        <X size={32} className="text-gray-700" strokeWidth={2.6} />
        <span className="text-senior-button font-bold text-gray-800">돌아가기</span>
      </button>

      <div className="card-senior text-center">
        <div className="flex justify-center mb-3">
          <span
            className="flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 text-green-700"
            aria-hidden
          >
            <KeyRound size={36} />
          </span>
        </div>
        <h2 className="text-senior-heading mb-2">설정 들어가기</h2>
        <p className="text-senior-body text-gray-600 mb-1">
          잘못 들어오셨다면 위의 <strong>돌아가기</strong>를 누르세요.
        </p>
        <p className="text-senior-body text-gray-700 mb-5">
          설정을 바꾸려면 아래 숫자를 그대로 입력해 주세요.
        </p>

        {/* 안내 숫자 (크게) */}
        <div className="mb-4 rounded-2xl bg-green-50 border-2 border-green-200 py-4" aria-hidden>
          <span className="text-senior-title font-bold tracking-[0.3em] text-green-800">{GATE_CODE}</span>
        </div>

        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={value}
          onChange={(e) => {
            setError(false);
            setValue(e.target.value.replace(/\D/g, ""));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matched) handleSubmit();
          }}
          placeholder="숫자 입력"
          aria-label={`안내된 숫자 ${GATE_CODE} 입력`}
          aria-invalid={error}
          className={`w-full text-center text-senior-heading tracking-[0.3em] rounded-2xl border-2 py-4 mb-2 outline-none transition-colors ${
            error ? "border-red-400 bg-red-50 animate-shake" : "border-gray-300 focus:border-green-600"
          }`}
        />

        {error && (
          <p className="text-senior-body text-red-600 mb-1" role="alert">
            숫자를 다시 확인해 주세요
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!matched}
          className="btn-primary w-full mt-3 disabled:opacity-40"
          aria-label="설정 화면으로 들어가기"
        >
          설정하기
        </button>

        <button
          onClick={() => {
            try {
              speak(guideVoice);
            } catch {
              /* noop */
            }
          }}
          className="w-full flex items-center justify-center gap-2 rounded-2xl p-3 mt-3 border-2 border-gray-200 bg-white"
          aria-label="안내 음성 다시 듣기"
        >
          <Volume2 size={22} className="text-gray-700" />
          <span className="text-senior-button text-gray-700">안내 음성 다시 듣기</span>
        </button>
      </div>
    </div>
  );
}
