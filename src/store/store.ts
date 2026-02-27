"use client";

import { create } from "zustand";
import type { GameMode } from "@/features/game-shell/config";

type Difficulty = "easy" | "normal" | "hard";
type RetroTheme = "win98" | "mac-classic";
const VALID_DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];
const VALID_RETRO_THEMES: readonly RetroTheme[] = ["win98", "mac-classic"];

const isValidDifficulty = (value: unknown): value is Difficulty =>
    typeof value === "string" &&
    VALID_DIFFICULTIES.includes(value as Difficulty);

const isValidRetroTheme = (value: unknown): value is RetroTheme =>
    typeof value === "string" &&
    VALID_RETRO_THEMES.includes(value as RetroTheme);

const canUseStorage = (): boolean => typeof window !== "undefined";

const getStored = (key: string): string | null =>
    canUseStorage() ? localStorage.getItem(key) : null;

const setStored = (key: string, value: string): void => {
    if (!canUseStorage()) return;
    localStorage.setItem(key, value);
};

const detectDefaultRetroTheme = (): RetroTheme => {
    if (!canUseStorage()) return "win98";
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const source = `${nav.userAgentData?.platform || ""} ${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
    return /mac|iphone|ipad|ipod/.test(source) ? "mac-classic" : "win98";
};

interface TypingState {
    _hydrated: boolean;
    darkMode: boolean;
    progress: number;
    text: string;
    gameMode: GameMode;
    language: "korean" | "english";
    isMuted: boolean;
    highScore: number;
    difficulty: Difficulty;
    mobileMenuOpen: boolean;
    retroTheme: RetroTheme;
    _hydrate: () => void;
    toggleDarkMode: () => void;
    setProgress: (progress: number) => void;
    setText: (text: string) => void;
    setGameMode: (mode: GameMode) => void;
    toggleLanguage: () => void;
    setLanguage: (language: "korean" | "english") => void;
    toggleMute: () => void;
    setHighScore: (score: number) => void;
    setDifficulty: (difficulty: Difficulty) => void;
    setMobileMenuOpen: (open: boolean) => void;
    setRetroTheme: (theme: RetroTheme) => void;
    cycleRetroTheme: () => void;
}

const useTypingStore = create<TypingState>((set) => ({
    // 서버-안전한 기본값 (localStorage 읽지 않음 → hydration 불일치 방지)
    _hydrated: false,
    darkMode: false,
    progress: 0,
    text: "Start typing practice.",
    gameMode: "practice",
    language: "korean",
    isMuted: false,
    highScore: 0,
    difficulty: "normal",
    mobileMenuOpen: false,
    retroTheme: "win98",
    // 마운트 후 localStorage에서 복원
    _hydrate: () =>
        set(() => {
            const raw = getStored("difficulty");
            const themeRaw = getStored("retroTheme");
            return {
                _hydrated: true,
                darkMode: getStored("darkMode") === "true",
                language: getStored("language") === "english" ? "english" : "korean",
                highScore: Number(getStored("highScore")) || 0,
                difficulty: isValidDifficulty(raw) ? raw : "normal",
                retroTheme: isValidRetroTheme(themeRaw) ? themeRaw : detectDefaultRetroTheme(),
            };
        }),
    toggleDarkMode: () =>
        set((state) => {
            const darkMode = !state.darkMode;
            setStored("darkMode", String(darkMode));
            return { darkMode };
        }),
    setProgress: (progress: number) => set({ progress }),
    setText: (text: string) => set({ text }),
    setGameMode: (gameMode: GameMode) => set({ gameMode }),
    toggleLanguage: () =>
        set((state) => {
            const language = state.language === "korean" ? "english" : "korean";
            setStored("language", language);
            return { language };
        }),
    setLanguage: (language: "korean" | "english") => {
        setStored("language", language);
        set({ language });
    },
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    setHighScore: (highScore: number) => {
        setStored("highScore", String(highScore));
        set({ highScore });
    },
    setDifficulty: (difficulty: Difficulty) => {
        if (!isValidDifficulty(difficulty)) return;
        setStored("difficulty", difficulty);
        set({ difficulty });
    },
    setMobileMenuOpen: (mobileMenuOpen: boolean) => set({ mobileMenuOpen }),
    setRetroTheme: (retroTheme: RetroTheme) => {
        if (!isValidRetroTheme(retroTheme)) return;
        setStored("retroTheme", retroTheme);
        set({ retroTheme });
    },
    cycleRetroTheme: () =>
        set((state) => {
            const retroTheme = state.retroTheme === "win98" ? "mac-classic" : "win98";
            setStored("retroTheme", retroTheme);
            return { retroTheme };
        }),
}));

export default useTypingStore;
