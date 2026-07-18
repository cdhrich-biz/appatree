import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

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

const STORAGE_KEY = "appatree.preferences.v1";

function readStore(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Preferences>;
    return {
      textSize: p.textSize ?? DEFAULTS.textSize,
      volume: typeof p.volume === "number" ? p.volume : DEFAULTS.volume,
      ttsSpeed: typeof p.ttsSpeed === "number" ? p.ttsSpeed : DEFAULTS.ttsSpeed,
      autoplay: typeof p.autoplay === "boolean" ? p.autoplay : DEFAULTS.autoplay,
      highContrast: typeof p.highContrast === "boolean" ? p.highContrast : DEFAULTS.highContrast,
    };
  } catch {
    return DEFAULTS;
  }
}

const TEXT_SIZE_MAP = {
  small: { body: 18, button: 20, heading: 28, title: 32 },
  medium: { body: 20, button: 22, heading: 30, title: 36 },
  large: { body: 24, button: 26, heading: 34, title: 40 },
} as const;

interface PreferencesContextType {
  prefs: Preferences;
  isLoaded: boolean;
  update: (partial: Partial<Preferences>) => void;
  speak: (message: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(readStore);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(readStore());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((partial: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota/private mode: 무시 */
      }
      return next;
    });
  }, []);

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
    <PreferencesContext.Provider value={{ prefs, isLoaded: true, update, speak }}>
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
