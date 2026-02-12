import React, { useEffect } from "react";
import Header from "./Header";
import TypingInput from "./TypingInput";
import FallingWordsGame from "./FallingWordsGame";
import TypingDefenseGame from "./TypingDefenseGame";
import TypingRaceGame from "./TypingRaceGame";
import DictationGame from "./DictationGame";
import WordChainGame from "./WordChainGame";
import Footer from "./Footer";
import useTypingStore from "../store/store";

// Props 타입 정의 추가
interface MainLayoutProps {
    gameMode: "practice" | "falling-words" | "typing-defense" | "typing-race" | "dictation" | "word-chain";
}

// Props 타입을 컴포넌트에 적용
const MainLayout: React.FC<MainLayoutProps> = ({ gameMode }) => {
    const setGameMode = useTypingStore((state) => state.setGameMode);

    // URL에서 받은 gameMode를 스토어에 동기화
    useEffect(() => {
        setGameMode(gameMode);
    }, [gameMode, setGameMode]);

    return (
        <div className="h-full min-h-0 flex flex-col gap-2.5 md:gap-3 text-gray-800 dark:text-gray-100">
            <div className="rounded-2xl border border-sky-200/40 dark:border-sky-500/10 bg-white/80 dark:bg-[#162032]/80 backdrop-blur-xl shadow-lg shadow-sky-900/5 dark:shadow-black/20 animate-panel-in">
                <Header />
            </div>

            <main className="flex-1 min-h-0 rounded-2xl border border-sky-200/40 dark:border-sky-500/10 bg-white/80 dark:bg-[#162032]/80 backdrop-blur-xl shadow-lg shadow-sky-900/5 dark:shadow-black/20 overflow-y-auto overscroll-contain animate-panel-in">
                <div className="w-full max-w-5xl 2xl:max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-2 sm:py-4 md:py-6 min-h-full flex flex-col">
                    {gameMode === "falling-words" ? (
                        <FallingWordsGame />
                    ) : gameMode === "typing-defense" ? (
                        <TypingDefenseGame />
                    ) : gameMode === "typing-race" ? (
                        <TypingRaceGame />
                    ) : gameMode === "dictation" ? (
                        <DictationGame />
                    ) : gameMode === "word-chain" ? (
                        <WordChainGame />
                    ) : (
                        <TypingInput />
                    )}
                </div>
            </main>

            <div className="rounded-2xl border border-sky-200/40 dark:border-sky-500/10 bg-white/80 dark:bg-[#162032]/80 backdrop-blur-xl shadow-lg shadow-sky-900/5 dark:shadow-black/20 animate-panel-in">
                <Footer />
            </div>
        </div>
    );
};

export default MainLayout;
