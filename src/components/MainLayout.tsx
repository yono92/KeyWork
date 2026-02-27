"use client";

import React, { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Header from "./Header";
import useTypingStore from "../store/store";
import { Card } from "@/components/ui/card";
import type { GameMode } from "@/features/game-shell/config";

const TypingInput = dynamic(() => import("./TypingInput"), { ssr: false });
const FallingWordsGame = dynamic(() => import("./FallingWordsGame"), { ssr: false });
const WordChainGame = dynamic(() => import("./WordChainGame"), { ssr: false });
const TypingRunnerGame = dynamic(() => import("./TypingRunnerGame"), { ssr: false });
const TetrisGame = dynamic(() => import("./TetrisGame"), { ssr: false });

interface MainLayoutProps {
    gameMode: GameMode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ gameMode }) => {
    const setGameMode = useTypingStore((state) => state.setGameMode);

    const modeViewMap: Record<GameMode, React.ReactNode> = useMemo(() => ({
        practice: <TypingInput />,
        "falling-words": <FallingWordsGame />,
        "typing-runner": <TypingRunnerGame />,
        "word-chain": <WordChainGame />,
        tetris: <TetrisGame />,
    }), []);

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
