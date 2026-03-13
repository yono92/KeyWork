"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface GameInvite {
    fromUserId: string;
    fromNickname: string;
    gameMode: string;
    roomCode: string;
    timestamp: number;
}

/**
 * 대전 초대 전송/수신 훅
 * - 글로벌 invite 채널 (user:{userId}) 에서 초대 수신
 * - 친구에게 초대 전송
 */
export function useGameInvite() {
    const { user, profile } = useAuthContext();
    const [pendingInvite, setPendingInvite] = useState<GameInvite | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // 초대 수신 채널 구독
    useEffect(() => {
        if (!user) return;

        const supabase = createClient();
        const channel = supabase.channel(`invite:${user.id}`)
            .on("broadcast", { event: "game_invite" }, ({ payload }) => {
                const invite = payload as GameInvite;
                // 30초 이내의 초대만 유효
                if (Date.now() - invite.timestamp < 30000) {
                    setPendingInvite(invite);
                }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            void supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [user]);

    /** 초대 전송 */
    const sendInvite = useCallback(
        async (targetUserId: string, gameMode: string, roomCode: string) => {
            if (!user || !profile) return;

            const supabase = createClient();
            const channel = supabase.channel(`invite:${targetUserId}`);

            await channel.subscribe();
            await channel.send({
                type: "broadcast",
                event: "game_invite",
                payload: {
                    fromUserId: user.id,
                    fromNickname: profile.nickname,
                    gameMode,
                    roomCode,
                    timestamp: Date.now(),
                } satisfies GameInvite,
            });

            await supabase.removeChannel(channel);
        },
        [user, profile],
    );

    const dismissInvite = useCallback(() => setPendingInvite(null), []);

    return { pendingInvite, sendInvite, dismissInvite };
}
