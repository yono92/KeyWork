"use client";

import React, { useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import MainLayout from "../../../src/components/MainLayout";
import Header from "@/components/Header";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import dynamic from "next/dynamic";
import useTypingStore from "@/store/store";

const TetrisBattle = dynamic(() => import("@/components/multiplayer/TetrisBattle"), { ssr: false });

type PlayMode = "single" | "lobby" | "battle";
type BattleInfo = { getChannel: () => RealtimeChannel | null; roomId: string; isHost: boolean };

export default function TetrisPage() {
    const [mode, setMode] = useState<PlayMode>("single");
    const [battleInfo, setBattleInfo] = useState<BattleInfo | null>(null);
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";

    const handleGameStart = useCallback(
        (getChannel: () => RealtimeChannel | null, roomId: string, isHost: boolean) => {
            setBattleInfo({ getChannel, roomId, isHost });
            setMode("battle");
        },
        [],
    );

    const handleBack = useCallback(() => {
        setBattleInfo(null);
        setMode("lobby");
    }, []);

    if (mode === "single") {
        return (
            <div className="relative h-full">
                <MainLayout gameMode="tetris" />
                <button
                    onClick={() => setMode("lobby")}
                    className="absolute top-2 right-2 z-20 px-3 py-1.5 text-xs font-bold border-2
                        border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]
                        bg-[var(--retro-surface)] text-[var(--retro-accent)] hover:bg-[var(--retro-accent)] hover:text-[var(--retro-text-inverse)]
                        transition-colors"
                >
                    {ko ? "🎮 온라인 대전" : "🎮 Online Battle"}
                </button>
            </div>
        );
    }

    if (mode === "battle" && battleInfo) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <Header />
                <div className="flex-1 min-h-0 overflow-hidden p-2">
                    <TetrisBattle
                        getChannel={battleInfo.getChannel}
                        roomId={battleInfo.roomId}
                        isHost={battleInfo.isHost}
                        onFinish={handleBack}
                    />
                </div>
            </div>
        );
    }

    // lobby mode
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-hidden p-2">
                <MultiplayerLobby
                    gameMode="tetris"
                    gameName={ko ? "테트리스" : "Tetris"}
                    onGameStart={handleGameStart}
                    onBack={() => setMode("single")}
                />
            </div>
        </div>
    );
}
