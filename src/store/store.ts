"use client";

import { create } from "zustand";

type GameMode =
    | "practice"
    | "falling-words"
    | "typing-defense"
    | "typing-race"
    | "typing-runner"
    | "dictation"
    | "word-chain";

type Difficulty = "easy" | "normal" | "hard";
const VALID_DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

const isValidDifficulty = (value: unknown): value is Difficulty =>
    typeof value === "string" &&
    VALID_DIFFICULTIES.includes(value as Difficulty);

const canUseStorage = (): boolean => typeof window !== "undefined";

const getStored = (key: string): string | null =>
    canUseStorage() ? localStorage.getItem(key) : null;

const setStored = (key: string, value: string): void => {
    if (!canUseStorage()) return;
    localStorage.setItem(key, value);
};

interface TypingState {
    _hydrated: boolean;
    darkMode: boolean;
    progress: number;
    text: string;
    input: string;
    gameMode: GameMode;
    language: "korean" | "english";
    isMuted: boolean;
    highScore: number;
    difficulty: Difficulty;
    xp: number;
    mobileMenuOpen: boolean;
    _hydrate: () => void;
    toggleDarkMode: () => void;
    setProgress: (progress: number) => void;
    setText: (text: string) => void;
    setInput: (input: string) => void;
    setGameMode: (mode: GameMode) => void;
    toggleLanguage: () => void;
    setLanguage: (language: "korean" | "english") => void;
    toggleMute: () => void;
    setHighScore: (score: number) => void;
    setDifficulty: (difficulty: Difficulty) => void;
    setMobileMenuOpen: (open: boolean) => void;
    addXp: (amount: number) => void;
}

const useTypingStore = create<TypingState>((set) => ({
    // 서버-안전한 기본값 (localStorage 읽지 않음 → hydration 불일치 방지)
    _hydrated: false,
    darkMode: false,
    progress: 0,
    text: "Start typing practice.",
    input: "",
    gameMode: "practice",
    language: "korean",
    isMuted: false,
    highScore: 0,
    difficulty: "normal",
    xp: 0,
    mobileMenuOpen: false,
    // 마운트 후 localStorage에서 복원
    _hydrate: () =>
        set(() => {
            const raw = getStored("difficulty");
            return {
                _hydrated: true,
                darkMode: getStored("darkMode") === "true",
                language: getStored("language") === "english" ? "english" : "korean",
                highScore: Number(getStored("highScore")) || 0,
                difficulty: isValidDifficulty(raw) ? raw : "normal",
                xp: Number(getStored("xp")) || 0,
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
    setInput: (input: string) => set({ input }),
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
    addXp: (amount: number) =>
        set((state) => {
            const xp = state.xp + Math.round(amount);
            setStored("xp", String(xp));
            return { xp };
        }),
}));

export default useTypingStore;
