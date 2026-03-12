"use client";

import React, { useState } from "react";
import MainLayout from "../../../src/components/MainLayout";
import Header from "@/components/Header";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import TetrisBattle from "@/components/multiplayer/TetrisBattle";
import useTypingStore from "@/store/store";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";

type PlayMode = "single" | "online";

export default function TetrisPage() {
    const [mode, setMode] = useState<PlayMode>("single");
    const room = useMultiplayerRoom("tetris");
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";
    const inRoom = !!room.roomId || room.phase === "countdown" || room.phase === "playing" || room.phase === "finished";

    if (mode === "single") {
        return (
            <div className="relative h-full">
                <MainLayout gameMode="tetris" />
                <button
                    onClick={() => setMode("online")}
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

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-hidden p-2">
                {inRoom ? (
                    <TetrisBattle room={room} onFinish={() => { void room.leaveRoom(); }} />
                ) : (
                    <MultiplayerLobby
                        gameName={ko ? "테트리스" : "Tetris"}
                        room={room}
                        onBack={() => setMode("single")}
                    />
                )}
            </div>
        </div>
    );
}
