import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface Preferences {
  textSize: "small" | "medium" | "large";
  volume: number;
  ttsSpeed: number;
  autoplay: boolean;
  highContrast: boolean;
}

const DEFAULTS: Preferences = {
  textSize: "medium",
  volume: 70,
  ttsSpeed: 0.9,
  autoplay: true,
  highContrast: false,
};

const TEXT_SIZE_MAP = {
  small: { body: 18, button: 20, heading: 28, title: 32 },
  medium: { body: 20, button: 22, heading: 30, title: 36 },
  large: { body: 24, button: 26, heading: 34, title: 40 },
} as const;

interface PreferencesContextType {
  prefs: Preferences;
  isLoaded: boolean;
  speak: (message: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const prefsQuery = trpc.preferences.get.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const prefs: Preferences = useMemo(() => {
    if (!prefsQuery.data) return DEFAULTS;
    const d = prefsQuery.data;
    return {
      textSize: (d.textSize as Preferences["textSize"]) ?? DEFAULTS.textSize,
      volume: d.volume ?? DEFAULTS.volume,
      ttsSpeed: Number(d.ttsSpeed) || DEFAULTS.ttsSpeed,
      autoplay: d.autoplay ?? DEFAULTS.autoplay,
      highContrast: d.highContrast ?? DEFAULTS.highContrast,
    };
  }, [prefsQuery.data]);

  // Apply text size CSS variables to :root
  useEffect(() => {
    const root = document.documentElement;
    const sizes = TEXT_SIZE_MAP[prefs.textSize];
    root.style.setProperty("--text-senior-body", `${sizes.body}px`);
    root.style.setProperty("--text-senior-button", `${sizes.button}px`);
    root.style.setProperty("--text-senior-heading", `${sizes.heading}px`);
    root.style.setProperty("--text-senior-title", `${sizes.title}px`);
  }, [prefs.textSize]);

  // Apply high contrast mode
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [prefs.highContrast]);

  const speak = (message: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "ko-KR";
    utterance.rate = prefs.ttsSpeed;
    utterance.volume = prefs.volume / 100;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <PreferencesContext.Provider value={{ prefs, isLoaded: !!prefsQuery.data, speak }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
