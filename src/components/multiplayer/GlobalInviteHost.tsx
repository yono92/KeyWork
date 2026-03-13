"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import useTypingStore from "@/store/store";
import { useGameInvite } from "@/hooks/useGameInvite";
import InviteToast from "./InviteToast";

const SUPPORTED_INVITE_ROUTES: Record<string, string> = {
    tetris: "/tetris",
    "word-chain": "/word-chain",
};

export default function GlobalInviteHost() {
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const { pendingInvite, dismissInvite } = useGameInvite();
    const router = useRouter();
    const ko = language === "korean";

    const handleAccept = useCallback(() => {
        if (!pendingInvite) return;

        const targetPath = SUPPORTED_INVITE_ROUTES[pendingInvite.gameMode];
        if (!targetPath) {
            dismissInvite();
            return;
        }

        dismissInvite();
        router.push(`${targetPath}?online=1&invite=${encodeURIComponent(pendingInvite.roomCode)}`);
    }, [dismissInvite, pendingInvite, router]);

    if (!pendingInvite) return null;

    return (
        <InviteToast
            invite={pendingInvite}
            ko={ko}
            rounded={retroTheme === "mac-classic"}
            onAccept={handleAccept}
            onDismiss={dismissInvite}
        />
    );
}
