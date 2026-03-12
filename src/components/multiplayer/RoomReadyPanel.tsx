"use client";

import type { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { useAuthContext } from "@/components/auth/AuthProvider";
import PixelAvatar from "@/components/avatar/PixelAvatar";
import { Button } from "@/components/ui/button";
import useTypingStore from "@/store/store";

interface RoomReadyPanelProps {
    room: ReturnType<typeof useMultiplayerRoom>;
    onLeave: () => void;
    title: string;
    description: string;
}

export default function RoomReadyPanel({ room, onLeave, title, description }: RoomReadyPanelProps) {
    const { profile } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";

    return (
        <div
            role="region"
            aria-label={ko ? "대전 준비 패널" : "Match ready panel"}
            className="absolute z-20 border-2 border-[var(--retro-border-mid)] bg-[var(--retro-surface)]/95 shadow-[6px_6px_0_rgba(0,0,0,0.16)] backdrop-blur-sm
                bottom-3 left-3 right-3 w-auto max-w-none
                sm:bottom-auto sm:top-3 sm:right-3 sm:left-auto sm:w-[280px] sm:max-w-[calc(100%-1.5rem)]"
        >
            <div className="retro-titlebar h-9 px-3 flex items-center justify-between border-b border-black/25">
                <span className="text-xs font-semibold text-current">
                    {title}
                </span>
                <button
                    type="button"
                    onClick={onLeave}
                    aria-label={ko ? "방 나가기" : "Leave room"}
                    className="text-[11px] font-bold text-current/70 hover:text-current"
                >
                    {ko ? "나가기" : "Leave"}
                </button>
            </div>

            <div className="space-y-3 p-3">
                <p className="text-xs text-[var(--retro-text)]/70">
                    {description}
                </p>

                <div className="flex gap-3 sm:flex-col sm:gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <PixelAvatar config={profile?.avatar_config ?? null} nickname={profile?.nickname ?? "?"} size="sm" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-[var(--retro-text)]">
                                {profile?.nickname ?? "Player"}
                            </p>
                            <p className={`text-[10px] font-bold ${room.myReady ? "text-emerald-600" : "text-[var(--retro-text)]/45"}`}>
                                {room.myReady ? "READY" : (ko ? "준비 전" : "NOT READY")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <PixelAvatar config={room.opponentAvatarConfig} nickname={room.opponentNickname ?? "?"} size="sm" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-[var(--retro-text)]">
                                {room.opponentNickname ?? (ko ? "대기 중" : "Waiting...")}
                            </p>
                            <p className={`text-[10px] font-bold ${room.opponentReady ? "text-emerald-600" : "text-[var(--retro-text)]/45"}`}>
                                {room.opponentReady ? "READY" : room.opponentUserId ? (ko ? "준비 전" : "NOT READY") : (ko ? "입장 대기 중" : "WAITING")}
                            </p>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={() => room.setReady(!room.myReady)}
                    disabled={!room.opponentUserId || room.phase !== "waiting"}
                    aria-pressed={room.myReady}
                    className="w-full font-semibold"
                >
                    {room.myReady
                        ? ko ? "준비 해제" : "Cancel Ready"
                        : ko ? "Ready" : "Ready"}
                </Button>
            </div>
        </div>
    );
}
