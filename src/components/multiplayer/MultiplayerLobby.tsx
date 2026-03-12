"use client";

import React from "react";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useTypingStore from "@/store/store";
import PixelAvatar from "@/components/avatar/PixelAvatar";

interface MultiplayerLobbyProps {
    gameName: string;
    room: ReturnType<typeof useMultiplayerRoom>;
    onBack: () => void;
}

export default function MultiplayerLobby({ gameName, room, onBack }: MultiplayerLobbyProps) {
    const { isLoggedIn, loading } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const ko = language === "korean";

    React.useEffect(() => {
        fetch("/api/rooms/cleanup", { method: "POST" }).catch(() => {});
    }, []);

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

    const formatElapsed = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return ko ? "방금 전" : "just now";
        if (diff < 3600) return ko ? `${Math.floor(diff / 60)}분 전` : `${Math.floor(diff / 60)}m ago`;
        return ko ? `${Math.floor(diff / 3600)}시간 전` : `${Math.floor(diff / 3600)}h ago`;
    };

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
                            {ko ? "온라인 흐름" : "Flow"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--retro-text)]">
                            {ko ? "방을 만들거나 목록에서 참가하면 즉시 게임룸으로 들어갑니다." : "Create a room or join one from the list to enter the game room immediately."}
                        </p>
                    </div>

                    <Button
                        onClick={room.createRoom}
                        className={`w-full font-semibold ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                    >
                        {ko ? "게임룸 만들기" : "Create Game Room"}
                    </Button>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[var(--retro-text)]/70">
                            {ko ? "참가 가능한 방" : "Open Rooms"}
                            {room.waitingRooms.length > 0 && (
                                <span className="ml-1 text-[var(--retro-accent)]">({room.waitingRooms.length})</span>
                            )}
                        </p>
                    </div>
                    <div className="border border-[var(--retro-border-mid)] bg-[var(--retro-bg)] min-h-[120px] max-h-[220px] overflow-y-auto">
                        {room.waitingRooms.length === 0 ? (
                            <div className="flex h-[120px] flex-col items-center justify-center gap-1 text-xs text-[var(--retro-text)]/40">
                                <span>{ko ? "참가 가능한 방이 없습니다" : "No rooms available"}</span>
                                <span>{ko ? "첫 게임룸을 만들어 보세요." : "Create the first room."}</span>
                            </div>
                        ) : (
                            <ul className="divide-y divide-[var(--retro-border-mid)]">
                                {room.waitingRooms.map((waitingRoom) => (
                                    <li
                                        key={waitingRoom.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`${ko ? "입장" : "Join"}: ${waitingRoom.player1_nickname}`}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--retro-accent)]/10 focus-visible:bg-[var(--retro-accent)]/10 focus-visible:outline-2 focus-visible:outline-[var(--retro-accent)] cursor-pointer transition-colors"
                                        onClick={() => room.joinRoom(waitingRoom.id)}
                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); room.joinRoom(waitingRoom.id); } }}
                                    >
                                        <PixelAvatar
                                            config={waitingRoom.player1_avatar_config}
                                            nickname={waitingRoom.player1_nickname}
                                            size="sm"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--retro-text)] truncate">
                                                {waitingRoom.player1_nickname}
                                            </p>
                                            <p className="text-[10px] text-[var(--retro-text)]/40">
                                                {ko ? "생성" : "Opened"} · {formatElapsed(waitingRoom.created_at)}
                                            </p>
                                        </div>
                                        <span className="text-xs text-[var(--retro-accent)] font-semibold shrink-0">
                                            {ko ? "입장" : "Enter"}
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
