"use client";

import React, { useState } from "react";
import { useFriends } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import PixelAvatar from "@/components/avatar/PixelAvatar";
import { Send, Users, X } from "lucide-react";

interface Props {
    ko: boolean;
    rounded: boolean;
    roomCode: string | null;
    onInvite: (targetUserId: string) => void;
}

const FriendInvitePanel: React.FC<Props> = ({ ko, rounded, roomCode, onInvite }) => {
    const { friends, loading } = useFriends();
    const [open, setOpen] = useState(false);
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());

    const rnd = rounded ? "rounded-lg" : "rounded-none";

    if (!open) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                disabled={friends.length === 0 && !loading}
                className={`w-full gap-1.5 text-xs ${rnd}`}
            >
                <Users className="h-3.5 w-3.5" />
                {ko
                    ? `친구 초대${friends.length > 0 ? ` (${friends.length})` : ""}`
                    : `Invite Friends${friends.length > 0 ? ` (${friends.length})` : ""}`}
            </Button>
        );
    }

    const handleInvite = (friendId: string) => {
        onInvite(friendId);
        setSentTo((prev) => new Set(prev).add(friendId));
    };

    return (
        <div className={`border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-3 space-y-2 ${rnd}`}>
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/50">
                    {ko ? "친구 초대" : "Invite Friends"}
                </p>
                <button onClick={() => setOpen(false)} className="text-[var(--retro-text)]/40 hover:text-[var(--retro-text)]">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {loading ? (
                <p className="py-2 text-center text-xs text-[var(--retro-text)]/40">
                    {ko ? "불러오는 중..." : "Loading..."}
                </p>
            ) : friends.length === 0 ? (
                <p className="py-2 text-center text-xs text-[var(--retro-text)]/40">
                    {ko ? "친구가 없습니다. 프로필에서 추가하세요." : "No friends. Add some from your profile."}
                </p>
            ) : (
                <div className="max-h-[160px] space-y-1 overflow-y-auto">
                    {friends.map((f) => (
                        <div
                            key={f.friendId}
                            className="flex items-center gap-2 rounded-lg border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-2.5 py-1.5"
                        >
                            <PixelAvatar config={f.avatarConfig} nickname={f.nickname} size="sm" />
                            <span className="flex-1 truncate text-sm font-semibold text-[var(--retro-text)]">
                                {f.nickname}
                            </span>
                            {sentTo.has(f.friendId) ? (
                                <span className="text-[10px] font-bold text-[var(--retro-accent)]">
                                    {ko ? "초대됨" : "Sent"}
                                </span>
                            ) : (
                                <button
                                    onClick={() => handleInvite(f.friendId)}
                                    disabled={!roomCode}
                                    className="rounded-lg bg-[var(--retro-accent)] p-1.5 text-[var(--retro-text-inverse)] hover:opacity-80 disabled:opacity-30"
                                >
                                    <Send className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FriendInvitePanel;
