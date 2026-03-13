"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "../../../src/components/MainLayout";
import Header from "@/components/Header";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import TetrisBattle from "@/components/multiplayer/TetrisBattle";
import useTypingStore from "@/store/store";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { useGameInvite } from "@/hooks/useGameInvite";

type PlayMode = "single" | "online";

function TetrisPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const inviteCode = searchParams.get("invite");
    const inviteTarget = searchParams.get("inviteTarget");
    const forceOnline = searchParams.get("online") === "1" || !!inviteCode || !!inviteTarget;
    const [mode, setMode] = useState<PlayMode>(forceOnline ? "online" : "single");
    const room = useMultiplayerRoom("tetris");
    const { sendInvite } = useGameInvite();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";
    const inRoom = !!room.roomId || room.phase === "countdown" || room.phase === "playing" || room.phase === "finished";
    const handledInviteRef = useRef<string | null>(null);
    const handledOutgoingRef = useRef<string | null>(null);

    useEffect(() => {
        if (forceOnline) {
            setMode("online");
        }
    }, [forceOnline]);

    useEffect(() => {
        if (!inviteCode || handledInviteRef.current === inviteCode) return;
        if (room.roomId || room.phase === "joining" || room.phase === "creating") return;

        handledInviteRef.current = inviteCode;
        void room.joinRoom(inviteCode).then(() => {
            router.replace("/tetris?online=1");
        });
    }, [inviteCode, room, router]);

    useEffect(() => {
        if (!inviteTarget || handledOutgoingRef.current === inviteTarget) return;
        if (room.roomId || room.phase === "creating" || room.phase === "joining") return;

        handledOutgoingRef.current = inviteTarget;
        void room.createRoom();
    }, [inviteTarget, room]);

    useEffect(() => {
        if (!inviteTarget || !room.roomId) return;
        if (room.phase !== "waiting" || !room.isHost) return;
        if (handledOutgoingRef.current !== inviteTarget) return;

        void sendInvite(inviteTarget, "tetris", room.roomId).then(() => {
            router.replace("/tetris?online=1");
        });
    }, [inviteTarget, room.isHost, room.phase, room.roomId, router, sendInvite]);

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
                        gameMode="tetris"
                        room={room}
                        onBack={() => setMode("single")}
                    />
                )}
            </div>
        </div>
    );
}

export default function TetrisPage() {
    return (
        <Suspense fallback={null}>
            <TetrisPageContent />
        </Suspense>
    );
}
