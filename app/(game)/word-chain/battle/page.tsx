"use client";

import Header from "@/components/Header";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import WordChainBattle from "@/components/multiplayer/WordChainBattle";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";

export default function WordChainBattlePage() {
    const room = useMultiplayerRoom("word-chain");
    const inRoom = !!room.roomId || room.phase === "countdown" || room.phase === "playing" || room.phase === "finished";

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-hidden p-2">
                {inRoom ? (
                    <WordChainBattle room={room} onFinish={() => { void room.leaveRoom(); }} />
                ) : (
                    <MultiplayerLobby
                        gameName="Word Chain"
                        room={room}
                        onBack={() => window.history.back()}
                    />
                )}
            </div>
        </div>
    );
}
