"use client";

import React, { useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AvatarConfig } from "@/lib/supabase/types";
import Header from "@/components/Header";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import dynamic from "next/dynamic";

const TetrisBattle = dynamic(() => import("@/components/multiplayer/TetrisBattle"), { ssr: false });

type BattleState =
    | { phase: "lobby" }
    | { phase: "playing"; getChannel: () => RealtimeChannel | null; roomId: string; isHost: boolean; opponentNickname: string; opponentAvatarConfig: AvatarConfig | null };

export default function TetrisBattlePage() {
    const [state, setState] = useState<BattleState>({ phase: "lobby" });

    const handleGameStart = useCallback(
        (getChannel: () => RealtimeChannel | null, roomId: string, isHost: boolean, opponentNickname: string, opponentAvatarConfig: AvatarConfig | null) => {
            setState({ phase: "playing", getChannel, roomId, isHost, opponentNickname, opponentAvatarConfig });
        },
        [],
    );

    const handleBack = useCallback(() => setState({ phase: "lobby" }), []);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-hidden p-2">
                {state.phase === "lobby" ? (
                    <MultiplayerLobby
                        gameMode="tetris"
                        gameName="Tetris"
                        onGameStart={handleGameStart}
                        onBack={handleBack}
                    />
                ) : (
                    <TetrisBattle
                        getChannel={state.getChannel}
                        roomId={state.roomId}
                        isHost={state.isHost}
                        opponentNickname={state.opponentNickname}
                        opponentAvatarConfig={state.opponentAvatarConfig}
                        onFinish={handleBack}
                    />
                )}
            </div>
        </div>
    );
}
