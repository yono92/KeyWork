"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

// 채널에 등록된 핸들러를 추적하기 위한 WeakSet
const registeredChannels = new WeakSet<RealtimeChannel>();

interface WordEvent {
    word: string;
    userId: string;
    valid: boolean;
    nextChar: string;
}

interface TurnEvent {
    currentUserId: string;
    timer: number;
}

export function useMultiplayerWordChain(
    getChannel: () => RealtimeChannel | null,
    isPlaying: boolean,
    myUserId: string,
) {
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [opponentWord, setOpponentWord] = useState<string | null>(null);
    const [currentChar, setCurrentChar] = useState("");
    const [opponentLives, setOpponentLives] = useState(3);
    const [myLives, setMyLives] = useState(3);

    useEffect(() => {
        const channel = getChannel();
        if (!channel || !isPlaying) return;
        if (registeredChannels.has(channel)) return;
        registeredChannels.add(channel);

        channel.on("broadcast", { event: "word_submit" }, ({ payload }: { payload: unknown }) => {
            const data = payload as WordEvent;
            if (data.userId !== myUserId) {
                setOpponentWord(data.word);
                setCurrentChar(data.nextChar);
                setIsMyTurn(true);
            }
        });

        channel.on("broadcast", { event: "word_result" }, ({ payload }: { payload: unknown }) => {
            const data = payload as { userId: string; lives: number };
            if (data.userId !== myUserId) {
                setOpponentLives(data.lives);
            } else {
                setMyLives(data.lives);
            }
        });

        channel.on("broadcast", { event: "turn_change" }, ({ payload }: { payload: unknown }) => {
            const data = payload as TurnEvent;
            setIsMyTurn(data.currentUserId === myUserId);
        });
    }, [getChannel, isPlaying, myUserId]);

    const broadcastWord = useCallback((word: string, nextChar: string) => {
        const channel = getChannel();
        if (!channel) return;
        channel.send({
            type: "broadcast",
            event: "word_submit",
            payload: { word, userId: myUserId, valid: true, nextChar },
        });
    }, [getChannel, myUserId]);

    const broadcastLives = useCallback((lives: number) => {
        const channel = getChannel();
        if (!channel) return;
        channel.send({
            type: "broadcast",
            event: "word_result",
            payload: { userId: myUserId, lives },
        });
    }, [getChannel, myUserId]);

    const broadcastTurn = useCallback((currentUserId: string, timer: number) => {
        const channel = getChannel();
        if (!channel) return;
        channel.send({
            type: "broadcast",
            event: "turn_change",
            payload: { currentUserId, timer },
        });
    }, [getChannel]);

    return {
        isMyTurn,
        setIsMyTurn,
        opponentWord,
        currentChar,
        setCurrentChar,
        opponentLives,
        myLives,
        setMyLives,
        broadcastWord,
        broadcastLives,
        broadcastTurn,
    };
}
