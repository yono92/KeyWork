import { create } from "zustand";

// 상태를 정의하는 인터페이스
interface TypingState {
    darkMode: boolean;
    progress: number;
    text: string;
    toggleDarkMode: () => void;
    setProgress: (progress: number) => void;
    setText: (text: string) => void;
}

// Zustand를 사용해 전역 상태 스토어 생성
const useTypingStore = create<TypingState>((set) => ({
    darkMode: true, // 초기값: 다크모드 활성화
    progress: 0, // 초기값: 진행 상황
    text: "고생 끝에 낙이 온다", // 초기 텍스트

    // 다크모드를 토글하는 함수
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

    // 진행 상황을 업데이트하는 함수
    setProgress: (progress: number) => set({ progress }),

    // 타이핑할 텍스트를 설정하는 함수
    setText: (text: string) => set({ text }),
}));

export default useTypingStore;
