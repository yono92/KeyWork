"use client";

import React from "react";
import type { GameInvite } from "@/hooks/useGameInvite";
import { Button } from "@/components/ui/button";
import { Swords, X } from "lucide-react";

interface Props {
    invite: GameInvite;
    ko: boolean;
    rounded: boolean;
    onAccept: () => void;
    onDismiss: () => void;
}

const InviteToast: React.FC<Props> = ({ invite, ko, rounded, onAccept, onDismiss }) => {
    const rnd = rounded ? "rounded-xl" : "rounded-none";

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 w-80 border-2 border-[var(--retro-accent)] bg-[var(--retro-surface)] shadow-lg ${rnd}`}
            style={{ animation: "game-celebration 0.4s ease-out" }}
        >
            <div className="flex items-center gap-2 border-b border-[var(--retro-border-mid)] bg-[var(--retro-accent)]/10 px-3 py-2">
                <Swords className="h-4 w-4 text-[var(--retro-accent)]" />
                <span className="flex-1 text-sm font-bold text-[var(--retro-text)]">
                    {ko ? "대전 초대" : "Game Invite"}
                </span>
                <button onClick={onDismiss} className="text-[var(--retro-text)]/40 hover:text-[var(--retro-text)]">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="px-3 py-3">
                <p className="text-sm text-[var(--retro-text)]">
                    <span className="font-bold">{invite.fromNickname}</span>
                    {ko ? "님이 대전에 초대했습니다" : " invited you to a match"}
                </p>
                <p className="mt-1 text-xs text-[var(--retro-text)]/50">
                    {ko ? `모드: ${invite.gameMode}` : `Mode: ${invite.gameMode}`}
                </p>
                <div className="mt-3 flex gap-2">
                    <Button
                        size="sm"
                        onClick={onAccept}
                        className={`flex-1 ${rnd}`}
                    >
                        {ko ? "수락" : "Accept"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onDismiss}
                        className={`flex-1 ${rnd}`}
                    >
                        {ko ? "거절" : "Decline"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default InviteToast;
