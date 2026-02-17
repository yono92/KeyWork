"use client";

import { create } from "zustand";

type GameMode =
    | "practice"
    | "falling-words"
    | "typing-defense"
    | "typing-race"
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
    darkMode: getStored("darkMode") === "true",
    progress: 0,
    text: "Start typing practice.",
    input: "",
    gameMode: "practice",
    language: getStored("language") === "english" ? "english" : "korean",
    isMuted: false,
    highScore: Number(getStored("highScore")) || 0,
    difficulty: (() => {
        const raw = getStored("difficulty");
        return isValidDifficulty(raw) ? raw : "normal";
    })(),
    xp: Number(getStored("xp")) || 0,
    mobileMenuOpen: false,
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
