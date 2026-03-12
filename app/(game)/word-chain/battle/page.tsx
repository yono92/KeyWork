"use client";

import React, { useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AvatarConfig } from "@/lib/supabase/types";
import Header from "@/components/Header";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import dynamic from "next/dynamic";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";

const WordChainBattle = dynamic(() => import("@/components/multiplayer/WordChainBattle"), { ssr: false });

type BattleState =
    | { phase: "lobby" }
    | { phase: "playing"; getChannel: () => RealtimeChannel | null; roomId: string; isHost: boolean; opponentNickname: string; opponentAvatarConfig: AvatarConfig | null; opponentUserId: string };

export default function WordChainBattlePage() {
    const [state, setState] = useState<BattleState>({ phase: "lobby" });
    const room = useMultiplayerRoom("word-chain");

    const handleGameStart = useCallback(
        (getChannel: () => RealtimeChannel | null, roomId: string, isHost: boolean, opponentNickname: string, opponentAvatarConfig: AvatarConfig | null, opponentUserId: string) => {
            setState({ phase: "playing", getChannel, roomId, isHost, opponentNickname, opponentAvatarConfig, opponentUserId });
        },
        [],
    );

    const handleBack = useCallback(() => {
        void room.leaveRoom();
        setState({ phase: "lobby" });
    }, [room]);

    const handleLobbyBack = useCallback(() => {
        setState({ phase: "lobby" });
    }, []);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-hidden p-2">
                {state.phase === "lobby" ? (
                    <MultiplayerLobby
                        gameName="Word Chain"
                        room={room}
                        onGameStart={handleGameStart}
                        onBack={handleLobbyBack}
                    />
                ) : (
                    <WordChainBattle
                        getChannel={state.getChannel}
                        roomId={state.roomId}
                        isHost={state.isHost}
                        opponentNickname={state.opponentNickname}
                        opponentAvatarConfig={state.opponentAvatarConfig}
                        opponentUserId={state.opponentUserId}
                        onFinish={handleBack}
                    />
                )}
            </div>
        </div>
    );
}
