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

    // 경과 시간 포맷
    const formatElapsed = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return ko ? "방금 전" : "just now";
        if (diff < 3600) return ko ? `${Math.floor(diff / 60)}분 전` : `${Math.floor(diff / 60)}m ago`;
        return ko ? `${Math.floor(diff / 3600)}시간 전` : `${Math.floor(diff / 3600)}h ago`;
    };

    // 로비 메인
    return (
        <Card className={`max-w-md mx-auto mt-8 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
            <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                <span className="text-sm font-semibold text-current">
                    {gameName} — {ko ? "온라인 대전" : "Online Battle"}
                </span>
            </div>
            <CardContent className="p-5 space-y-4">
                {room.error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2">{room.error}</p>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                    <Button
                        onClick={room.quickMatch}
                        className={`flex-1 font-semibold ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                    >
                        {ko ? "빠른 매칭" : "Quick Match"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={room.createRoom}
                        className={`flex-1 ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                    >
                        {ko ? "방 만들기" : "Create Room"}
                    </Button>
                </div>

                {/* 대기 중인 방 목록 */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[var(--retro-text)]/70">
                            {ko ? "대기 중인 방" : "Waiting Rooms"}
                            {room.waitingRooms.length > 0 && (
                                <span className="ml-1 text-[var(--retro-accent)]">({room.waitingRooms.length})</span>
                            )}
                        </p>
                    </div>
                    <div className="border border-[var(--retro-border-mid)] bg-[var(--retro-bg)] min-h-[120px] max-h-[200px] overflow-y-auto">
                        {room.waitingRooms.length === 0 ? (
                            <div className="flex items-center justify-center h-[120px] text-xs text-[var(--retro-text)]/40">
                                {ko ? "대기 중인 방이 없습니다" : "No rooms available"}
                            </div>
                        ) : (
                            <ul className="divide-y divide-[var(--retro-border-mid)]">
                                {room.waitingRooms.map((wr) => (
                                    <li
                                        key={wr.id}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--retro-accent)]/10 cursor-pointer transition-colors"
                                        onClick={() => room.joinRoom(wr.id)}
                                    >
                                        <PixelAvatar
                                            config={wr.player1_avatar_config}
                                            nickname={wr.player1_nickname}
                                            size="sm"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--retro-text)] truncate">
                                                {wr.player1_nickname}
                                            </p>
                                            <p className="text-[10px] text-[var(--retro-text)]/40 font-mono">
                                                {wr.id} · {formatElapsed(wr.created_at)}
                                            </p>
                                        </div>
                                        <span className="text-xs text-[var(--retro-accent)] font-semibold shrink-0">
                                            {ko ? "참가" : "Join"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* 코드로 참가 */}
                <div className="flex items-center gap-2 text-xs text-[var(--retro-text)]/40">
                    <div className="flex-1 border-t border-[var(--retro-border-mid)]" />
                    <span>{ko ? "코드로 참가" : "Join by code"}</span>
                    <div className="flex-1 border-t border-[var(--retro-border-mid)]" />
                </div>

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
