import { create } from "zustand";

// 게임 모드 타입 정의
type GameMode = "practice" | "falling-words";

// 상태를 정의하는 인터페이스
interface TypingState {
    // 기존 상태
    darkMode: boolean;
    progress: number;
    text: string;

    // 게임 모드 관련 상태
    gameMode: GameMode;

    // 언어 상태 추가
    language: "korean" | "english";

    // 기존 액션
    toggleDarkMode: () => void;
    setProgress: (progress: number) => void;
    setText: (text: string) => void;

    // 게임 모드 변경 액션
    setGameMode: (mode: GameMode) => void;

    // 언어 변경 액션 추가
    toggleLanguage: () => void;
}

// Zustand를 사용해 전역 상태 스토어 생성
const useTypingStore = create<TypingState>((set) => ({
    // 기존 초기값
    darkMode: true,
    progress: 0,
    text: "고생 끝에 낙이 온다",

    // 게임 모드 초기값
    gameMode: "practice" as GameMode,

    // 언어 초기값
    language: "korean",

    // 기존 액션
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    setProgress: (progress: number) => set({ progress }),
    setText: (text: string) => set({ text }),

    // 게임 모드 변경 액션
    setGameMode: (mode: GameMode) => set({ gameMode: mode }),

    // 언어 변경 액션 추가
    toggleLanguage: () =>
        set((state) => ({
            language: state.language === "korean" ? "english" : "korean",
        })),
}));

export default useTypingStore;
