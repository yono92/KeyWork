import { create } from "zustand";

// 게임 모드 타입 정의
type GameMode = "practice" | "falling-words";

// 상태를 정의하는 인터페이스
interface TypingState {
    // 기존 상태
    darkMode: boolean;
    progress: number;
    text: string;
    input: string;

    // 게임 모드 및 언어 상태
    gameMode: "practice" | "falling-words";
    language: "korean" | "english";

    // 기존 액션
    toggleDarkMode: () => void;
    setProgress: (progress: number) => void;
    setText: (text: string) => void;
    setInput: (input: string) => void;

    // 게임 모드 및 언어 변경 액션
    setGameMode: (mode: GameMode) => void;
    toggleLanguage: () => void;

    // 음소거 관련 상태
    isMuted: boolean;
    toggleMute: () => void;
}

// Zustand를 사용해 전역 상태 스토어 생성
const useTypingStore = create<TypingState>((set) => ({
    // 기존 초기값
    darkMode: localStorage.getItem("darkMode") === "true",
    progress: 0,
    text: "타이핑 연습을 시작하세요.",
    input: "",

    // 게임 모드 초기값
    gameMode: "practice", // 기본값, URL에서 덮어씌워짐

    // 언어 초기값
    language:
        localStorage.getItem("language") === "english" ? "english" : "korean",

    // 기존 액션
    toggleDarkMode: () =>
        set((state) => {
            const newDarkMode = !state.darkMode;
            localStorage.setItem("darkMode", String(newDarkMode));
            return { darkMode: newDarkMode };
        }),
    setProgress: (progress: number) => set({ progress }),
    setText: (text: string) => set({ text }),
    setInput: (input: string) => set({ input }),

    // 게임 모드 변경 액션
    setGameMode: (mode: GameMode) => set({ gameMode: mode }),

    // 언어 변경 액션 추가
    toggleLanguage: () =>
        set((state) => {
            const newLanguage =
                state.language === "korean" ? "english" : "korean";
            localStorage.setItem("language", newLanguage);
            return { language: newLanguage };
        }),

    // 음소거 관련 상태
    isMuted: false,
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));

export default useTypingStore;
