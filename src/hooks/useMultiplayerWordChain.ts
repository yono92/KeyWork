"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isOwnBroadcast } from "@/lib/multiplayerRealtime";

interface WordEvent {
    word: string;
    userId: string;
    valid: boolean;
    nextChar: string;
    senderId: string;
}

interface TurnEvent {
    currentUserId: string;
    timer: number;
    senderId: string;
}

interface LivesEvent {
    userId: string;
    lives: number;
    senderId: string;
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

    const resetState = useCallback(() => {
        setIsMyTurn(false);
        setOpponentWord(null);
        setCurrentChar("");
        setOpponentLives(3);
        setMyLives(3);
    }, []);

    const activeRef = useRef(false);
    useEffect(() => {
        const channel = getChannel();
        if (!channel || !isPlaying) return;
        activeRef.current = true;

        channel.on("broadcast", { event: "word_submit" }, ({ payload }: { payload: unknown }) => {
            if (!activeRef.current) return;
            const data = payload as WordEvent;
            if (isOwnBroadcast(data, myUserId)) return;
            if (data.userId !== myUserId) {
                setOpponentWord(data.word);
                setCurrentChar(data.nextChar);
                setIsMyTurn(true);
            }
        });

        channel.on("broadcast", { event: "word_result" }, ({ payload }: { payload: unknown }) => {
            if (!activeRef.current) return;
            const data = payload as LivesEvent;
            if (isOwnBroadcast(data, myUserId)) return;
            setOpponentLives(data.lives);
        });

        channel.on("broadcast", { event: "turn_change" }, ({ payload }: { payload: unknown }) => {
            if (!activeRef.current) return;
            const data = payload as TurnEvent;
            if (isOwnBroadcast(data, myUserId)) return;
            setIsMyTurn(data.currentUserId === myUserId);
        });

        return () => {
            activeRef.current = false;
        };
    }, [getChannel, isPlaying, myUserId]);

    const broadcastWord = useCallback((word: string, nextChar: string) => {
        const channel = getChannel();
        if (!channel) return;
        channel.send({
            type: "broadcast",
            event: "word_submit",
            payload: { word, userId: myUserId, valid: true, nextChar, senderId: myUserId },
        });
    }, [getChannel, myUserId]);

    const broadcastLives = useCallback((lives: number) => {
        const channel = getChannel();
        if (!channel) return;
        channel.send({
            type: "broadcast",
            event: "word_result",
            payload: { userId: myUserId, lives, senderId: myUserId },
        });
    }, [getChannel, myUserId]);

    const broadcastTurn = useCallback((currentUserId: string, timer: number) => {
        const channel = getChannel();
        if (!channel) return;
        channel.send({
            type: "broadcast",
            event: "turn_change",
            payload: { currentUserId, timer, senderId: myUserId },
        });
    }, [getChannel, myUserId]);

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
        resetState,
    };
}
