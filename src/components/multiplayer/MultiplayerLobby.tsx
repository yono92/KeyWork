"use client";

import React from "react";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useTypingStore from "@/store/store";
import PixelAvatar from "@/components/avatar/PixelAvatar";

import type { AvatarConfig } from "@/lib/supabase/types";

interface MultiplayerLobbyProps {
    gameName: string;
    room: ReturnType<typeof useMultiplayerRoom>;
    onGameStart: (channel: ReturnType<typeof useMultiplayerRoom>["getChannel"], roomId: string, isHost: boolean, opponentNickname: string, opponentAvatarConfig: AvatarConfig | null, opponentUserId: string) => void;
    onBack: () => void;
}

export default function MultiplayerLobby({ gameName, room, onGameStart, onBack }: MultiplayerLobbyProps) {
    const { isLoggedIn, loading } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const ko = language === "korean";

    // 로비 진입 시 오래된 방 정리 (비동기, 실패 무시)
    React.useEffect(() => {
        fetch("/api/rooms/cleanup", { method: "POST" }).catch(() => {});
    }, []);

    // 게임 시작 감지
    React.useEffect(() => {
        if (room.phase === "playing" && room.roomId && room.opponentUserId) {
            onGameStart(room.getChannel, room.roomId, room.isHost, room.opponentNickname ?? "Player", room.opponentAvatarConfig, room.opponentUserId);
        }
    }, [room.phase, room.getChannel, room.roomId, room.isHost, room.opponentNickname, room.opponentAvatarConfig, room.opponentUserId, onGameStart]);

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
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/50">
                                {ko ? "공개 대기방" : "Public Lobby"}
                            </p>
                            <p className="text-2xl font-black text-[var(--retro-accent)]">
                                {ko ? "입장 대기 중" : "Waiting for Player"}
                            </p>
                            <p className="text-xs text-[var(--retro-text)]/65">
                                {ko
                                    ? "이 방은 공개 목록에 노출됩니다. 다른 플레이어가 목록에서 바로 참가할 수 있습니다."
                                    : "This room is visible in the public list. Other players can join directly from the lobby."}
                            </p>
                            <p className="text-xs text-[var(--retro-text)]/60" style={{ animation: "tetris-blink 1.2s step-end infinite" }}>
                                {room.opponentNickname
                                    ? `${room.opponentNickname} ${ko ? "참가함!" : "joined!"}`
                                    : ko ? "목록에서 참가할 상대를 기다리는 중..." : "Waiting for someone to join from the list..."}
                            </p>
                        </div>
                    )}
                    {!room.roomId && (
                        <p className="text-sm text-[var(--retro-text)]/60" style={{ animation: "tetris-blink 1.2s step-end infinite" }}>
                            {ko ? "공개 방을 준비하는 중..." : "Preparing public room..."}
                        </p>
                    )}
                    {room.error && (
                        <p className="text-xs text-red-600">{room.error}</p>
                    )}
                    <Button
                        variant="outline"
                        onClick={async () => { await room.leaveRoom(); onBack(); }}
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
                    {gameName} — {ko ? "공개 로비" : "Public Lobby"}
                </span>
            </div>
            <CardContent className="p-5 space-y-4">
                {room.error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2">{room.error}</p>
                )}

                <div className="space-y-3">
                    <div className="rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)]/70 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/50">
                            {ko ? "입장 방식" : "Flow"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--retro-text)]">
                            {ko ? "공개 방을 만들거나, 아래 목록에서 바로 참가하세요." : "Create a public room, or join directly from the list below."}
                        </p>
                    </div>

                    <Button
                        onClick={room.createRoom}
                        className={`w-full font-semibold ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                    >
                        {ko ? "공개 방 만들기" : "Create Public Room"}
                    </Button>
                </div>

                {/* 대기 중인 방 목록 */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[var(--retro-text)]/70">
                            {ko ? "참가 가능한 공개 방" : "Open Rooms"}
                            {room.waitingRooms.length > 0 && (
                                <span className="ml-1 text-[var(--retro-accent)]">({room.waitingRooms.length})</span>
                            )}
                        </p>
                    </div>
                    <div className="border border-[var(--retro-border-mid)] bg-[var(--retro-bg)] min-h-[120px] max-h-[200px] overflow-y-auto">
                        {room.waitingRooms.length === 0 ? (
                            <div className="flex h-[120px] flex-col items-center justify-center gap-1 text-xs text-[var(--retro-text)]/40">
                                <span>{ko ? "참가 가능한 공개 방이 없습니다" : "No public rooms available"}</span>
                                <span>{ko ? "첫 방을 만들어 보세요." : "Create the first room."}</span>
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
                                            <p className="text-[10px] text-[var(--retro-text)]/40">
                                                {ko ? "생성" : "Opened"} · {formatElapsed(wr.created_at)}
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
