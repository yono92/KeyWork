"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AvatarConfig } from "@/lib/supabase/types";
import { getRoomCutoffIso } from "@/lib/multiplayerRealtime";

export type RoomPhase = "idle" | "creating" | "joining" | "waiting" | "countdown" | "playing" | "finished" | "disconnected";

export interface WaitingRoom {
    id: string;
    game_mode: string;
    created_at: string;
    player1_nickname: string;
    player1_avatar_config: AvatarConfig | null;
}

interface RoomState {
    roomId: string | null;
    phase: RoomPhase;
    isHost: boolean;
    opponentUserId: string | null;
    opponentNickname: string | null;
    opponentAvatarConfig: AvatarConfig | null;
    countdown: number;
    error: string | null;
}

const INITIAL_ROOM_STATE: RoomState = {
    roomId: null,
    phase: "idle",
    isHost: false,
    opponentUserId: null,
    opponentNickname: null,
    opponentAvatarConfig: null,
    countdown: 3,
    error: null,
};

const DISCONNECT_TIMEOUT_MS = 5000;

const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const supabase = createClient();

export function useMultiplayerRoom(gameMode: string) {
    const { user, profile } = useAuthContext();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [state, setState] = useState<RoomState>(INITIAL_ROOM_STATE);
    const [waitingRooms, setWaitingRooms] = useState<WaitingRoom[]>([]);

    const cleanup = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
        }
        sessionStorage.removeItem("mp_roomId");
    }, []);

    const resetRoomState = useCallback(() => {
        setState({ ...INITIAL_ROOM_STATE });
    }, []);

    const startCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
        setState((prev) => ({ ...prev, phase: "countdown", countdown: 3 }));
        let count = 3;
        countdownRef.current = setInterval(() => {
            count -= 1;
            if (count <= 0) {
                if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                }
                setState((prev) => ({ ...prev, phase: "playing", countdown: 0 }));
                return;
            }
            setState((prev) => ({ ...prev, countdown: count }));
        }, 1000);
    }, []);

    const fetchWaitingRooms = useCallback(async () => {
        if (!user || !profile) return;
        const cutoff = getRoomCutoffIso();
        const { data } = await supabase
            .from("rooms")
            .select("id, game_mode, created_at, player1_id, profiles!rooms_player1_id_fkey(nickname, avatar_config)")
            .eq("status", "waiting")
            .eq("game_mode", gameMode)
            .neq("player1_id", user.id)
            .is("player2_id", null)
            .gt("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(20);

        if (!data) return;

        setWaitingRooms(
            data.map((room) => {
                const player = room.profiles as unknown as { nickname: string; avatar_config: AvatarConfig | null } | null;
                return {
                    id: room.id,
                    game_mode: room.game_mode,
                    created_at: room.created_at,
                    player1_nickname: player?.nickname ?? "Player",
                    player1_avatar_config: player?.avatar_config ?? null,
                };
            }),
        );
    }, [gameMode, profile, user]);

    useEffect(() => {
        if (!user || !profile) return;

        void fetchWaitingRooms();

        const channel = supabase
            .channel(`room-list:${gameMode}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "rooms", filter: `game_mode=eq.${gameMode}` },
                () => { void fetchWaitingRooms(); },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchWaitingRooms, gameMode, profile, user]);

    const subscribeToRoom = useCallback((roomId: string): Promise<void> => {
        if (!user || !profile) return Promise.resolve();

        return new Promise((resolve) => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }

            const channel = supabase.channel(`room:${roomId}`, {
                config: {
                    presence: { key: user.id },
                    broadcast: { self: true },
                },
            });

            channel
                .on("presence", { event: "join" }, ({ newPresences }) => {
                    const opponent = newPresences.find((presence) => (presence as Record<string, unknown>).user_id !== user.id);
                    if (!opponent) return;

                    if (disconnectTimerRef.current) {
                        clearTimeout(disconnectTimerRef.current);
                        disconnectTimerRef.current = null;
                    }

                    const remote = opponent as Record<string, unknown>;
                    setState((prev) => ({
                        ...prev,
                        opponentUserId: (remote.user_id as string) ?? null,
                        opponentNickname: (remote.nickname as string) ?? "Player",
                        opponentAvatarConfig: (remote.avatar_config as AvatarConfig) ?? null,
                    }));
                })
                .on("presence", { event: "leave" }, ({ leftPresences }) => {
                    const opponentLeft = leftPresences.some((presence) => (presence as Record<string, unknown>).user_id !== user.id);
                    if (!opponentLeft) return;

                    setState((prev) => {
                        if (prev.phase === "playing") {
                            disconnectTimerRef.current = setTimeout(() => {
                                setState((current) => ({
                                    ...current,
                                    phase: "finished",
                                    error: "WIN",
                                }));
                                channelRef.current?.send({
                                    type: "broadcast",
                                    event: "game_over",
                                    payload: { winner_id: user.id, reason: "disconnect" },
                                });
                            }, DISCONNECT_TIMEOUT_MS);
                        }

                        return {
                            ...prev,
                            opponentUserId: null,
                            opponentNickname: null,
                            opponentAvatarConfig: null,
                        };
                    });
                })
                .on("broadcast", { event: "game_start" }, () => {
                    startCountdown();
                })
                .on("broadcast", { event: "game_over" }, ({ payload }) => {
                    if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                        countdownRef.current = null;
                    }
                    setState((prev) => ({
                        ...prev,
                        phase: "finished",
                        error: (payload as { winner_id?: string })?.winner_id === user.id ? "WIN" : "LOSE",
                    }));
                })
                .subscribe(async (status) => {
                    if (status !== "SUBSCRIBED") return;

                    await channel.track({
                        user_id: user.id,
                        nickname: profile.nickname ?? "Player",
                        avatar_config: profile.avatar_config ?? null,
                        online_at: new Date().toISOString(),
                    });
                    resolve();
                });

            channelRef.current = channel;
        });
    }, [profile, startCountdown, user]);

    const createRoom = useCallback(async () => {
        if (!user || !profile) return;

        setState((prev) => ({ ...prev, phase: "creating", error: null }));

        const roomId = generateRoomCode();
        const { error } = await supabase.from("rooms").insert({
            id: roomId,
            game_mode: gameMode,
            status: "waiting",
            player1_id: user.id,
        });

        if (error) {
            setState((prev) => ({ ...prev, phase: "idle", error: error.message }));
            return;
        }

        sessionStorage.setItem("mp_roomId", roomId);
        setState((prev) => ({
            ...prev,
            roomId,
            phase: "waiting",
            isHost: true,
            error: null,
        }));
        await subscribeToRoom(roomId);
    }, [gameMode, profile, subscribeToRoom, user]);

    const joinRoom = useCallback(async (code: string) => {
        if (!user || !profile) return;

        setState((prev) => ({ ...prev, phase: "joining", error: null }));
        const cutoff = getRoomCutoffIso();

        const { data: room, error: fetchError } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", code.toUpperCase())
            .eq("status", "waiting")
            .gt("created_at", cutoff)
            .single();

        if (fetchError || !room) {
            setState((prev) => ({
                ...prev,
                phase: "idle",
                error: "방을 찾을 수 없습니다",
            }));
            return;
        }

        if (room.game_mode !== gameMode) {
            setState((prev) => ({
                ...prev,
                phase: "idle",
                error: `이 방은 다른 게임 모드입니다 (${room.game_mode})`,
            }));
            return;
        }

        const { data: updated, error: updateError } = await supabase
            .from("rooms")
            .update({ player2_id: user.id, status: "playing" })
            .eq("id", code.toUpperCase())
            .eq("status", "waiting")
            .is("player2_id", null)
            .select("id")
            .maybeSingle();

        if (updateError || !updated) {
            setState((prev) => ({
                ...prev,
                phase: "idle",
                error: updateError?.message ?? "이미 다른 플레이어가 참가했습니다",
            }));
            return;
        }

        sessionStorage.setItem("mp_roomId", code.toUpperCase());
        setState((prev) => ({
            ...prev,
            roomId: code.toUpperCase(),
            phase: "waiting",
            isHost: false,
            error: null,
        }));

        await subscribeToRoom(code.toUpperCase());
        startCountdown();
        channelRef.current?.send({
            type: "broadcast",
            event: "game_start",
            payload: {},
        });
    }, [gameMode, profile, startCountdown, subscribeToRoom, user]);

    const quickMatch = useCallback(async () => {
        if (!user || !profile) return;

        setState((prev) => ({ ...prev, phase: "joining", error: null }));
        const cutoff = getRoomCutoffIso();

        const { data } = await supabase
            .from("rooms")
            .select("id")
            .eq("status", "waiting")
            .eq("game_mode", gameMode)
            .neq("player1_id", user.id)
            .gt("created_at", cutoff)
            .order("created_at", { ascending: true })
            .limit(1);

        if (data && data.length > 0) {
            await joinRoom(data[0].id);
            return;
        }

        await createRoom();
    }, [createRoom, gameMode, joinRoom, profile, user]);

    const broadcastGameOver = useCallback((winnerId: string) => {
        channelRef.current?.send({
            type: "broadcast",
            event: "game_over",
            payload: { winner_id: winnerId },
        });
    }, []);

    const getChannel = useCallback(() => channelRef.current, []);

    const leaveRoom = useCallback(async () => {
        if (user && state.roomId) {
            if (state.isHost || state.phase === "finished") {
                await supabase.from("rooms").delete().eq("id", state.roomId);
            } else {
                await supabase
                    .from("rooms")
                    .update({ player2_id: null, status: "waiting" })
                    .eq("id", state.roomId)
                    .eq("player2_id", user.id);
            }
        }

        cleanup();
        resetRoomState();
    }, [cleanup, resetRoomState, state.isHost, state.phase, state.roomId, user]);

    useEffect(() => {
        const savedRoomId = sessionStorage.getItem("mp_roomId");
        if (!savedRoomId || !user || !profile) return;

        setState((prev) => ({ ...prev, roomId: savedRoomId }));
        void subscribeToRoom(savedRoomId);
    }, [profile, subscribeToRoom, user]);

    useEffect(() => () => cleanup(), [cleanup]);

    return {
        ...state,
        waitingRooms,
        createRoom,
        joinRoom,
        quickMatch,
        leaveRoom,
        broadcastGameOver,
        getChannel,
        refreshRooms: fetchWaitingRooms,
    };
}
