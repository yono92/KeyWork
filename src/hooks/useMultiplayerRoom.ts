"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RoomPhase = "idle" | "creating" | "joining" | "waiting" | "countdown" | "playing" | "finished" | "disconnected";

import type { AvatarConfig } from "@/lib/supabase/types";

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
    opponentNickname: string | null;
    opponentAvatarConfig: AvatarConfig | null;
    countdown: number;
    error: string | null;
}

const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const DISCONNECT_TIMEOUT_MS = 5000; // 5초 오프라인 시 상대 승리

const supabase = createClient();

export function useMultiplayerRoom(gameMode: string) {
    const { user, profile } = useAuthContext();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const roomListChannelRef = useRef<RealtimeChannel | null>(null);

    const [state, setState] = useState<RoomState>({
        roomId: null,
        phase: "idle",
        isHost: false,
        opponentNickname: null,
        opponentAvatarConfig: null,
        countdown: 3,
        error: null,
    });

    const [waitingRooms, setWaitingRooms] = useState<WaitingRoom[]>([]);

    // 방 정리
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

    // 대기 중인 방 목록 조회
    const fetchWaitingRooms = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("rooms")
            .select("id, game_mode, created_at, player1_id, profiles!rooms_player1_id_fkey(nickname, avatar_config)")
            .eq("status", "waiting")
            .eq("game_mode", gameMode)
            .neq("player1_id", user.id)
            .is("player2_id", null)
            .order("created_at", { ascending: false })
            .limit(20);

        if (data) {
            setWaitingRooms(
                data.map((r) => {
                    const p = r.profiles as unknown as { nickname: string; avatar_config: AvatarConfig | null } | null;
                    return {
                        id: r.id,
                        game_mode: r.game_mode,
                        created_at: r.created_at,
                        player1_nickname: p?.nickname ?? "Player",
                        player1_avatar_config: p?.avatar_config ?? null,
                    };
                }),
            );
        }
    }, [user, gameMode]);

    // 방 목록 실시간 구독
    useEffect(() => {
        if (!user) return;
        void fetchWaitingRooms();

        const channel = supabase
            .channel("room-list")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "rooms", filter: `game_mode=eq.${gameMode}` },
                () => { void fetchWaitingRooms(); },
            )
            .subscribe();

        roomListChannelRef.current = channel;
        return () => {
            supabase.removeChannel(channel);
            roomListChannelRef.current = null;
        };
    }, [user, gameMode, fetchWaitingRooms]);

    // 채널 구독 — 구독 완료 시 resolve되는 Promise 반환
    const subscribeToRoom = useCallback((roomId: string): Promise<void> => {
        return new Promise((resolve) => {
            const channel = supabase.channel(`room:${roomId}`, {
                config: { presence: { key: user?.id ?? "anon" } },
            });

            channel
                .on("presence", { event: "join" }, ({ newPresences }) => {
                    const opponent = newPresences.find(
                        (p) => (p as Record<string, unknown>).user_id !== user?.id,
                    );
                    if (opponent) {
                        // 재접속 시 disconnect 타이머 취소
                        if (disconnectTimerRef.current) {
                            clearTimeout(disconnectTimerRef.current);
                            disconnectTimerRef.current = null;
                        }
                        const opp = opponent as Record<string, unknown>;
                        setState((prev) => ({
                            ...prev,
                            opponentNickname: (opp.nickname as string) ?? "Player",
                            opponentAvatarConfig: (opp.avatar_config as AvatarConfig) ?? null,
                        }));
                    }
                })
                .on("presence", { event: "leave" }, ({ leftPresences }) => {
                    const opponentLeft = leftPresences.some(
                        (p) => (p as Record<string, unknown>).user_id !== user?.id,
                    );
                    if (opponentLeft) {
                        setState((prev) => {
                            // playing 중 상대 이탈 → 5초 후 승리 처리
                            if (prev.phase === "playing") {
                                disconnectTimerRef.current = setTimeout(() => {
                                    setState((s) => ({
                                        ...s,
                                        phase: "finished",
                                        error: "WIN",
                                    }));
                                    channelRef.current?.send({
                                        type: "broadcast",
                                        event: "game_over",
                                        payload: { winner_id: user?.id, reason: "disconnect" },
                                    });
                                }, DISCONNECT_TIMEOUT_MS);
                            }
                            return { ...prev, opponentNickname: null };
                        });
                    }
                })
                .on("broadcast", { event: "game_start" }, () => {
                    setState((prev) => ({ ...prev, phase: "countdown", countdown: 3 }));
                    let count = 3;
                    countdownRef.current = setInterval(() => {
                        count -= 1;
                        if (count <= 0) {
                            if (countdownRef.current) clearInterval(countdownRef.current);
                            setState((prev) => ({ ...prev, phase: "playing", countdown: 0 }));
                        } else {
                            setState((prev) => ({ ...prev, countdown: count }));
                        }
                    }, 1000);
                })
                .on("broadcast", { event: "game_over" }, ({ payload }) => {
                    setState((prev) => ({
                        ...prev,
                        phase: "finished",
                        error: (payload as { winner_id?: string })?.winner_id === user?.id
                            ? "WIN" : "LOSE",
                    }));
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED") {
                        await channel.track({
                            user_id: user?.id,
                            nickname: profile?.nickname ?? "Player",
                            avatar_config: profile?.avatar_config ?? null,
                            online_at: new Date().toISOString(),
                        });
                        resolve();
                    }
                });

            channelRef.current = channel;
        });
    }, [supabase, user, profile]);

    // 방 생성
    const createRoom = useCallback(async () => {
        if (!user) return;
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
        }));
        await subscribeToRoom(roomId);
    }, [user, gameMode, supabase, subscribeToRoom]);

    // 방 참가
    const joinRoom = useCallback(async (code: string) => {
        if (!user) return;
        setState((prev) => ({ ...prev, phase: "joining", error: null }));

        const { data: room, error: fetchError } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", code.toUpperCase())
            .eq("status", "waiting")
            .single();

        if (fetchError || !room) {
            setState((prev) => ({
                ...prev,
                phase: "idle",
                error: "방을 찾을 수 없습니다",
            }));
            return;
        }

        // 게임 모드 불일치 검증
        if (room.game_mode !== gameMode) {
            setState((prev) => ({
                ...prev,
                phase: "idle",
                error: `이 방은 다른 게임 모드입니다 (${room.game_mode})`,
            }));
            return;
        }

        // Race condition 방지: player2_id가 null인 경우만 업데이트
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
        }));
        // 구독 완료까지 대기 후 game_start 브로드캐스트
        await subscribeToRoom(code.toUpperCase());

        channelRef.current?.send({
            type: "broadcast",
            event: "game_start",
            payload: {},
        });
    }, [user, supabase, subscribeToRoom]);

    // 빠른 매칭
    const quickMatch = useCallback(async () => {
        if (!user) return;
        setState((prev) => ({ ...prev, phase: "joining", error: null }));

        const { data: waitingRooms } = await supabase
            .from("rooms")
            .select("id")
            .eq("status", "waiting")
            .eq("game_mode", gameMode)
            .neq("player1_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1);

        if (waitingRooms && waitingRooms.length > 0) {
            await joinRoom(waitingRooms[0].id);
        } else {
            await createRoom();
        }
    }, [user, gameMode, supabase, joinRoom, createRoom]);

    // 게임 오버 브로드캐스트
    const broadcastGameOver = useCallback((winnerId: string) => {
        channelRef.current?.send({
            type: "broadcast",
            event: "game_over",
            payload: { winner_id: winnerId },
        });
    }, []);

    // 채널 레퍼런스 반환
    const getChannel = useCallback(() => channelRef.current, []);

    // 나가기
    const leaveRoom = useCallback(() => {
        cleanup();
        setState({
            roomId: null,
            phase: "idle",
            isHost: false,
            opponentNickname: null,
            opponentAvatarConfig: null,
            countdown: 3,
            error: null,
        });
    }, [cleanup]);

    // 재접속 시도
    useEffect(() => {
        const savedRoomId = sessionStorage.getItem("mp_roomId");
        if (savedRoomId && user) {
            setState((prev) => ({ ...prev, roomId: savedRoomId }));
            void subscribeToRoom(savedRoomId);
        }
    }, [user, subscribeToRoom]);

    // 언마운트 시 정리
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
