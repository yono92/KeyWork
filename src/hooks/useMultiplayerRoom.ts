"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AvatarConfig } from "@/lib/supabase/types";
import { canAutoStartMatch, getRoomCutoffIso } from "@/lib/multiplayerRealtime";

export type RoomPhase = "idle" | "creating" | "joining" | "waiting" | "countdown" | "playing" | "finished" | "disconnected";

interface ReadyPayload {
    userId: string;
    ready: boolean;
    senderId: string;
}

interface GameOverPayload {
    winner_id?: string;
}

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
    myReady: boolean;
    opponentReady: boolean;
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
    myReady: false,
    opponentReady: false,
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
    const matchStartingRef = useRef(false);
    const myReadyRef = useRef(false);
    const userIdRef = useRef(user?.id);
    userIdRef.current = user?.id;

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
        matchStartingRef.current = false;
        myReadyRef.current = false;
        sessionStorage.removeItem("mp_roomId");
    }, []);

    const resetRoomState = useCallback(() => {
        setState({ ...INITIAL_ROOM_STATE });
    }, []);

    const startCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }

        setState((prev) => ({
            ...prev,
            phase: "countdown",
            countdown: 3,
            error: null,
            myReady: false,
            opponentReady: false,
        }));

        myReadyRef.current = false;
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

    const publishReadyState = useCallback((ready: boolean) => {
        if (!user || !channelRef.current) return;
        channelRef.current.send({
            type: "broadcast",
            event: "ready_state",
            payload: {
                userId: user.id,
                ready,
                senderId: user.id,
            },
        });
    }, [user]);

    const setReady = useCallback((ready: boolean) => {
        myReadyRef.current = ready;
        setState((prev) => ({ ...prev, myReady: ready }));
        publishReadyState(ready);
    }, [publishReadyState]);

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
                    const opponent = newPresences.find((presence) => (presence as Record<string, unknown>).user_id !== userIdRef.current);
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

                    publishReadyState(myReadyRef.current);
                })
                .on("presence", { event: "leave" }, ({ leftPresences }) => {
                    const opponentLeft = leftPresences.some((presence) => (presence as Record<string, unknown>).user_id !== userIdRef.current);
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
                                    payload: { winner_id: userIdRef.current, reason: "disconnect" },
                                });
                            }, DISCONNECT_TIMEOUT_MS);
                        }

                        return {
                            ...prev,
                            opponentUserId: null,
                            opponentNickname: null,
                            opponentAvatarConfig: null,
                            opponentReady: false,
                        };
                    });
                })
                .on("broadcast", { event: "ready_state" }, ({ payload }) => {
                    const data = payload as ReadyPayload;
                    if (data.userId === userIdRef.current) return;
                    setState((prev) => ({
                        ...prev,
                        opponentReady: data.ready,
                    }));
                })
                .on("broadcast", { event: "game_start" }, () => {
                    matchStartingRef.current = false;
                    startCountdown();
                })
                .on("broadcast", { event: "game_over" }, ({ payload }) => {
                    if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                        countdownRef.current = null;
                    }
                    if (disconnectTimerRef.current) {
                        clearTimeout(disconnectTimerRef.current);
                        disconnectTimerRef.current = null;
                    }
                    matchStartingRef.current = false;
                    setState((prev) => ({
                        ...prev,
                        phase: "finished",
                        error: (payload as GameOverPayload)?.winner_id === userIdRef.current ? "WIN" : "LOSE",
                    }));
                })
                .on("broadcast", { event: "rematch_request" }, ({ payload }) => {
                    const data = payload as { senderId: string };
                    if (data.senderId === userIdRef.current) return;
                    // 상대가 리매치 요청 → 상대 ready 처리 + waiting 복귀
                    setState((prev) => ({
                        ...prev,
                        phase: "waiting",
                        error: null,
                        opponentReady: true,
                    }));
                    matchStartingRef.current = false;
                })
                .subscribe(async (status) => {
                    if (status !== "SUBSCRIBED") return;

                    await channel.track({
                        user_id: user.id,
                        nickname: profile.nickname ?? "Player",
                        avatar_config: profile.avatar_config ?? null,
                        online_at: new Date().toISOString(),
                    });

                    publishReadyState(myReadyRef.current);
                    resolve();
                });

            channelRef.current = channel;
        });
    }, [profile, publishReadyState, startCountdown, user]);

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
            myReady: false,
            opponentReady: false,
        }));
        myReadyRef.current = false;
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
            .update({ player2_id: user.id, status: "waiting" })
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
            myReady: false,
            opponentReady: false,
        }));
        myReadyRef.current = false;

        await subscribeToRoom(code.toUpperCase());
    }, [gameMode, profile, subscribeToRoom, user]);

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

    const broadcastGameOver = useCallback(async (winnerId: string) => {
        if (!state.roomId) return;

        await supabase
            .from("rooms")
            .update({ status: "finished", winner_id: winnerId })
            .eq("id", state.roomId);

        channelRef.current?.send({
            type: "broadcast",
            event: "game_over",
            payload: { winner_id: winnerId },
        });
    }, [state.roomId]);

    const getChannel = useCallback(() => channelRef.current, []);

    const requestRematch = useCallback(async () => {
        if (!user || !state.roomId) return;

        // DB 상태를 waiting으로 복원
        await supabase
            .from("rooms")
            .update({ status: "waiting", winner_id: null })
            .eq("id", state.roomId);

        // 로컬 상태: waiting + 내 ready=true
        myReadyRef.current = true;
        matchStartingRef.current = false;
        setState((prev) => ({
            ...prev,
            phase: "waiting",
            error: null,
            myReady: true,
        }));

        // 상대에게 리매치 요청 브로드캐스트
        channelRef.current?.send({
            type: "broadcast",
            event: "rematch_request",
            payload: { senderId: user.id },
        });

        // ready 상태도 전파
        publishReadyState(true);
    }, [publishReadyState, state.roomId, user]);

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
        if (!state.roomId || !user || !state.isHost) return;
        if (!canAutoStartMatch({
            isHost: state.isHost,
            myReady: state.myReady,
            opponentReady: state.opponentReady,
            opponentUserId: state.opponentUserId,
            phase: state.phase,
        })) {
            matchStartingRef.current = false;
            return;
        }
        if (matchStartingRef.current) return;

        matchStartingRef.current = true;

        void (async () => {
            await supabase
                .from("rooms")
                .update({ status: "playing", winner_id: null })
                .eq("id", state.roomId)
                .eq("player1_id", user.id);

            startCountdown();
            channelRef.current?.send({
                type: "broadcast",
                event: "game_start",
                payload: {},
            });
        })();
    }, [startCountdown, state.isHost, state.myReady, state.opponentReady, state.opponentUserId, state.phase, state.roomId, user]);

    useEffect(() => {
        const savedRoomId = sessionStorage.getItem("mp_roomId");
        if (!savedRoomId || !user || !profile) return;

        void (async () => {
            const { data: room } = await supabase
                .from("rooms")
                .select("id, status, player1_id")
                .eq("id", savedRoomId)
                .maybeSingle();

            if (!room) {
                sessionStorage.removeItem("mp_roomId");
                return;
            }

            setState((prev) => ({
                ...prev,
                roomId: savedRoomId,
                isHost: room.player1_id === user.id,
                phase: room.status === "playing" ? "playing" : "waiting",
            }));

            await subscribeToRoom(savedRoomId);
        })();
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
        setReady,
        requestRematch,
    };
}
