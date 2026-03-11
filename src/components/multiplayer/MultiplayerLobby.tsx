"use client";

import React, { useState } from "react";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useTypingStore from "@/store/store";
import PixelAvatar from "@/components/avatar/PixelAvatar";

import type { AvatarConfig } from "@/lib/supabase/types";

interface MultiplayerLobbyProps {
    gameMode: string;
    gameName: string;
    onGameStart: (channel: ReturnType<typeof useMultiplayerRoom>["getChannel"], roomId: string, isHost: boolean, opponentNickname: string, opponentAvatarConfig: AvatarConfig | null) => void;
    onBack: () => void;
}

export default function MultiplayerLobby({ gameMode, gameName, onGameStart, onBack }: MultiplayerLobbyProps) {
    const { isLoggedIn, loading } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const ko = language === "korean";
    const room = useMultiplayerRoom(gameMode);
    const [joinCode, setJoinCode] = useState("");

    // 로비 진입 시 오래된 방 정리 (비동기, 실패 무시)
    React.useEffect(() => {
        fetch("/api/rooms/cleanup", { method: "POST" }).catch(() => {});
    }, []);

    // 게임 시작 감지
    React.useEffect(() => {
        if (room.phase === "playing") {
            onGameStart(room.getChannel, room.roomId!, room.isHost, room.opponentNickname ?? "Player", room.opponentAvatarConfig);
        }
    }, [room.phase, room.getChannel, room.roomId, room.isHost, room.opponentNickname, room.opponentAvatarConfig, onGameStart]);

    if (loading) {
        return (
            <Card className={`max-w-sm mx-auto mt-8 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
                <CardContent className="p-6 text-center">
                    <p className="text-sm text-[var(--retro-text)]/60">
                        {ko ? "로딩 중..." : "Loading..."}
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!isLoggedIn) {
        return (
            <Card className={`max-w-sm mx-auto mt-8 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
                <CardContent className="p-6 text-center">
                    <p className="text-sm text-[var(--retro-text)]">
                        {ko ? "온라인 대전은 로그인이 필요합니다" : "Login required for online battle"}
                    </p>
                </CardContent>
            </Card>
        );
    }

    // 카운트다운
    if (room.phase === "countdown") {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <PixelAvatar config={room.opponentAvatarConfig} nickname={room.opponentNickname ?? "?"} size="lg" />
                        <p className="text-sm text-[var(--retro-text)]/60">
                            vs {room.opponentNickname}
                        </p>
                    </div>
                    <p
                        className="text-6xl font-black text-[var(--retro-accent)] tabular-nums"
                        style={{ animation: "tetris-score-pop 0.3s ease-out" }}
                    >
                        {room.countdown}
                    </p>
                </div>
            </div>
        );
    }

    // 대기 중
    if (room.phase === "waiting" || room.phase === "creating" || room.phase === "joining") {
        return (
            <Card className={`max-w-sm mx-auto mt-8 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
                <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                    <span className="text-sm font-semibold text-current">
                        {gameName} — {ko ? "온라인 대전" : "Online Battle"}
                    </span>
                </div>
                <CardContent className="p-5 text-center space-y-3">
                    {room.roomId && (
                        <>
                            <p className="text-xs text-[var(--retro-text)]/60">
                                {ko ? "방 코드" : "Room Code"}
                            </p>
                            <p className="text-3xl font-black tracking-[0.3em] text-[var(--retro-accent)] tabular-nums">
                                {room.roomId}
                            </p>
                            <p className="text-xs text-[var(--retro-text)]/60" style={{ animation: "tetris-blink 1.2s step-end infinite" }}>
                                {room.opponentNickname
                                    ? `${room.opponentNickname} ${ko ? "참가함!" : "joined!"}`
                                    : ko ? "상대를 기다리는 중..." : "Waiting for opponent..."}
                            </p>
                        </>
                    )}
                    {!room.roomId && (
                        <p className="text-sm text-[var(--retro-text)]/60" style={{ animation: "tetris-blink 1.2s step-end infinite" }}>
                            {ko ? "매칭 중..." : "Matching..."}
                        </p>
                    )}
                    {room.error && (
                        <p className="text-xs text-red-600">{room.error}</p>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => { room.leaveRoom(); onBack(); }}
                        className={`text-xs ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                    >
                        {ko ? "취소" : "Cancel"}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // 로비 메인
    return (
        <Card className={`max-w-sm mx-auto mt-8 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
            <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                <span className="text-sm font-semibold text-current">
                    {gameName} — {ko ? "온라인 대전" : "Online Battle"}
                </span>
            </div>
            <CardContent className="p-5 space-y-4">
                {room.error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2">{room.error}</p>
                )}

                <Button
                    onClick={room.quickMatch}
                    className={`w-full font-semibold ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                >
                    {ko ? "빠른 매칭" : "Quick Match"}
                </Button>

                <div className="flex items-center gap-2 text-xs text-[var(--retro-text)]/40">
                    <div className="flex-1 border-t border-[var(--retro-border-mid)]" />
                    <span>{ko ? "또는" : "or"}</span>
                    <div className="flex-1 border-t border-[var(--retro-border-mid)]" />
                </div>

                <Button
                    variant="outline"
                    onClick={room.createRoom}
                    className={`w-full ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                >
                    {ko ? "방 만들기" : "Create Room"}
                </Button>

                <div className="flex gap-2">
                    <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder={ko ? "방 코드 입력" : "Room Code"}
                        maxLength={6}
                        className="flex-1 text-center tracking-widest font-mono uppercase"
                    />
                    <Button
                        onClick={() => joinCode.length === 6 && room.joinRoom(joinCode)}
                        disabled={joinCode.length !== 6}
                        className={`${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                    >
                        {ko ? "참가" : "Join"}
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="w-full text-xs"
                >
                    {ko ? "← 뒤로" : "← Back"}
                </Button>
            </CardContent>
        </Card>
    );
}
