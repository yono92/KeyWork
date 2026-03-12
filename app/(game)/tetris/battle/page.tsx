"use client";

import Header from "@/components/Header";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import TetrisBattle from "@/components/multiplayer/TetrisBattle";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";

export default function TetrisBattlePage() {
    const room = useMultiplayerRoom("tetris");
    const inRoom = !!room.roomId || room.phase === "countdown" || room.phase === "playing" || room.phase === "finished";

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-hidden p-2">
                {inRoom ? (
                    <TetrisBattle room={room} onFinish={() => { void room.leaveRoom(); }} />
                ) : (
                    <MultiplayerLobby
                        gameName="Tetris"
                        room={room}
                        onBack={() => window.history.back()}
                    />
                )}
            </div>
        </div>
    );
}
