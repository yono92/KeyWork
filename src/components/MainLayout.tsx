"use client";

import React, { useEffect } from "react";
import Header from "./Header";
import TypingInput from "./TypingInput";
import FallingWordsGame from "./FallingWordsGame";
import WordChainGame from "./WordChainGame";
import TypingRunnerGame from "./TypingRunnerGame";
import TetrisGame from "./TetrisGame";
import useTypingStore from "../store/store";
import { Card } from "@/components/ui/card";
import type { GameMode } from "@/features/game-shell/config";

// Props 타입 정의 추가
interface MainLayoutProps {
    gameMode: GameMode;
}

// Props 타입을 컴포넌트에 적용
const MainLayout: React.FC<MainLayoutProps> = ({ gameMode }) => {
    const setGameMode = useTypingStore((state) => state.setGameMode);
    const modeViewMap: Record<GameMode, React.ReactNode> = {
        practice: <TypingInput />,
        "falling-words": <FallingWordsGame />,
        "typing-runner": <TypingRunnerGame />,
        "word-chain": <WordChainGame />,
        tetris: <TetrisGame />,
    };

    // URL에서 받은 gameMode를 스토어에 동기화
    useEffect(() => {
        setGameMode(gameMode);
    }, [gameMode, setGameMode]);

    return (
        <div className="h-full min-h-0 flex flex-col gap-2.5 md:gap-3 text-gray-800 dark:text-gray-100">
            <Card className="animate-panel-in bg-[var(--retro-surface)]">
                <Header />
            </Card>

            <main key={gameMode} className="flex-1 min-h-0 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-surface-alt)] overflow-y-auto overscroll-contain animate-page-in">
                <div className="w-full max-w-[1200px] 2xl:max-w-[1500px] mx-auto px-2 sm:px-4 md:px-8 py-2 sm:py-4 md:py-6 min-h-full flex flex-col">
                    {modeViewMap[gameMode]}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
