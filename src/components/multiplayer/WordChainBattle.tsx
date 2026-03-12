"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useMultiplayerWordChain } from "@/hooks/useMultiplayerWordChain";
import type { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useScoreSubmit } from "@/hooks/useScoreSubmit";
import useTypingStore from "@/store/store";
import GameInput from "@/components/game/GameInput";
import { isChainValid, getLastChar } from "@/utils/dueumUtils";
import { HANGUL_WORD_REGEX } from "@/utils/koreanConstants";
import { Button } from "@/components/ui/button";
import PixelAvatar from "@/components/avatar/PixelAvatar";
import RoomReadyPanel from "@/components/multiplayer/RoomReadyPanel";
import { pickStartingTurnUserId, shouldResetForMatchStart } from "@/lib/multiplayerRealtime";

async function validateWordApi(word: string): Promise<boolean> {
    try {
        const res = await fetch(`/api/krdict/validate?word=${encodeURIComponent(word)}`);
        if (!res.ok) return true;
        const data = await res.json();
        return data.exists === true;
    } catch {
        return true;
    }
}

interface WordChainBattleProps {
    room: ReturnType<typeof useMultiplayerRoom>;
    onFinish: () => void;
}

const TIME_LIMIT = 15;

export default function WordChainBattle({ room, onFinish }: WordChainBattleProps) {
    const { user, profile } = useAuthContext();
    const { submitScore } = useScoreSubmit();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";
    const myId = user?.id ?? "";
    const mp = useMultiplayerWordChain(room.getChannel, true, myId);

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ text: string; sender: "me" | "opponent"; valid: boolean }[]>([]);
    const [warmupWords, setWarmupWords] = useState<string[]>([]);
    const [timer, setTimer] = useState(TIME_LIMIT);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<"me" | "opponent" | null>(null);
    const [validating, setValidating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);
    const usedWordsRef = useRef<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMyTurnRef = useRef(mp.isMyTurn);
    const myLivesRef = useRef(mp.myLives);
    const prevPhaseRef = useRef<string | null>(null);
    const scoreSubmittedRef = useRef(false);

    isMyTurnRef.current = mp.isMyTurn;
    myLivesRef.current = mp.myLives;

    const setIsMyTurnStable = mp.setIsMyTurn;
    const broadcastTurnStable = mp.broadcastTurn;
    const setMyLivesStable = mp.setMyLives;
    const broadcastLivesStable = mp.broadcastLives;

    const resetOfficialState = useCallback(() => {
        mp.resetState();
        setInput("");
        setMessages([]);
        setWarmupWords([]);
        setTimer(TIME_LIMIT);
        setScore(0);
        setGameOver(false);
        setWinner(null);
        setValidating(false);
        usedWordsRef.current = new Set();
        scoreSubmittedRef.current = false;
    }, [mp]);

    useEffect(() => {
        if (!shouldResetForMatchStart(prevPhaseRef.current, room.phase)) {
            prevPhaseRef.current = room.phase;
            return;
        }

        resetOfficialState();

        if (room.isHost && room.opponentUserId) {
            const iGoFirst = Math.random() > 0.5;
            setIsMyTurnStable(iGoFirst);
            broadcastTurnStable(pickStartingTurnUserId(myId, room.opponentUserId, iGoFirst), TIME_LIMIT);
        }

        prevPhaseRef.current = room.phase;
    }, [broadcastTurnStable, myId, resetOfficialState, room.isHost, room.opponentUserId, room.phase, setIsMyTurnStable]);

    useEffect(() => {
        if (prevPhaseRef.current !== room.phase) {
            prevPhaseRef.current = room.phase;
        }
    }, [room.phase]);

    const applyLifePenalty = useCallback(() => {
        const newLives = myLivesRef.current - 1;
        setMyLivesStable(newLives);
        broadcastLivesStable(newLives);
        setTimer(TIME_LIMIT);
        if (newLives <= 0 && room.opponentUserId) {
            setGameOver(true);
            setWinner("opponent");
            void room.broadcastGameOver(room.opponentUserId);
        }
    }, [broadcastLivesStable, room, setMyLivesStable]);

    useEffect(() => {
        if (room.phase !== "playing" || gameOver || validating) return;

        timerRef.current = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    if (isMyTurnRef.current) {
                        const newLives = myLivesRef.current - 1;
                        setMyLivesStable(newLives);
                        broadcastLivesStable(newLives);
                        if (newLives <= 0 && room.opponentUserId) {
                            setGameOver(true);
                            setWinner("opponent");
                            void room.broadcastGameOver(room.opponentUserId);
                        }
                    }
                    return TIME_LIMIT;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [broadcastLivesStable, gameOver, room, room.phase, setMyLivesStable, validating]);

    useEffect(() => {
        const opponentWord = mp.opponentWord;
        if (opponentWord) {
            setMessages((prev) => [...prev, { text: opponentWord, sender: "opponent", valid: true }]);
            usedWordsRef.current.add(opponentWord.toLowerCase());
            setTimer(TIME_LIMIT);
        }
    }, [mp.opponentWord]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages, warmupWords]);

    useEffect(() => {
        if (room.phase === "finished") {
            setGameOver(true);
            setWinner(room.error === "WIN" ? "me" : "opponent");
        }
    }, [room.error, room.phase]);

    useEffect(() => {
        if (room.phase !== "finished" || !room.error || scoreSubmittedRef.current) return;

        scoreSubmittedRef.current = true;
        void submitScore({
            game_mode: "word-chain",
            score,
            is_multiplayer: true,
            is_win: room.error === "WIN",
        });
    }, [room.error, room.phase, score, submitScore]);

    const handleSubmit = useCallback(async () => {
        const word = input.trim();
        if (!word) return;

        if (room.phase !== "playing") {
            setWarmupWords((prev) => [...prev, word]);
            setInput("");
            return;
        }

        if (!mp.isMyTurn || gameOver || validating) return;
        setInput("");

        if (!HANGUL_WORD_REGEX.test(word)) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
            applyLifePenalty();
            return;
        }

        if (mp.currentChar && !isChainValid(mp.currentChar, word)) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
            applyLifePenalty();
            return;
        }

        if (usedWordsRef.current.has(word.toLowerCase())) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
            applyLifePenalty();
            return;
        }

        setValidating(true);
        const isValid = await validateWordApi(word);
        setValidating(false);

        if (!isValid) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
            applyLifePenalty();
            return;
        }

        usedWordsRef.current.add(word.toLowerCase());
        setMessages((prev) => [...prev, { text: word, sender: "me", valid: true }]);
        setScore((prev) => prev + word.length * 10);

        const nextChar = getLastChar(word);
        mp.setIsMyTurn(false);
        mp.broadcastWord(word, nextChar);
        mp.setCurrentChar(nextChar);
        setTimer(TIME_LIMIT);
    }, [applyLifePenalty, gameOver, input, mp, room.phase, validating]);

    const showCountdown = room.phase === "countdown";
    const showRoomPanel = room.phase === "waiting";

    return (
        <div className="relative w-full flex-1 min-h-[280px] overflow-hidden border border-sky-200/40 dark:border-sky-500/10 flex flex-col" style={{ background: "var(--retro-game-bg)" }}>
            {showRoomPanel && (
                <RoomReadyPanel
                    room={room}
                    onLeave={onFinish}
                    title={ko ? "끝말잇기 룸" : "Word Chain Room"}
                    description={
                        room.opponentUserId
                            ? ko ? "워밍업으로 단어를 적어두고 Ready를 누르세요. 두 플레이어가 모두 준비되면 공식 대전이 시작됩니다." : "Use the warmup input, then hit Ready. The official match starts when both players are ready."
                            : ko ? "상대가 들어오기 전까지 워밍업 입력을 해볼 수 있습니다." : "You can use the warmup input while waiting for another player."
                    }
                />
            )}

            <div className="flex justify-between items-center px-3 py-2 border-b border-[var(--retro-game-panel-border-lo)]" style={{ background: "var(--retro-game-panel)" }}>
                <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--retro-game-text)" }}>
                    <PixelAvatar config={profile?.avatar_config ?? null} nickname={profile?.nickname ?? "?"} size="sm" />
                    {ko ? "나" : "You"}: ❤️{mp.myLives} | {score}
                </div>
                <div className={`text-sm font-black tabular-nums ${timer <= 3 && room.phase === "playing" ? "text-red-500" : ""}`} style={{ color: timer <= 3 && room.phase === "playing" ? "var(--retro-game-danger)" : "var(--retro-game-warning)" }}>
                    {room.phase === "playing" ? `${timer}s` : ko ? "WARMUP" : "WARMUP"}
                </div>
                <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--retro-game-text)" }}>
                    <PixelAvatar config={room.opponentAvatarConfig} nickname={room.opponentNickname ?? "?"} size="sm" />
                    {ko ? "상대" : "Opp"}: ❤️{mp.opponentLives}
                </div>
            </div>

            {room.phase === "playing" && mp.currentChar && (
                <div className="text-center py-2 border-b border-[var(--retro-game-panel-border-lo)]">
                    <span className="text-2xl font-black" style={{ color: "var(--retro-game-info)" }}>
                        &quot;{mp.currentChar}&quot;
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--retro-game-text-dim)" }}>
                        {mp.isMyTurn ? (ko ? "내 차례" : "Your turn") : (ko ? "상대 차례" : "Opponent's turn")}
                    </span>
                </div>
            )}

            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {room.phase === "playing" ? (
                    messages.map((msg, i) => (
                        <div key={`${msg.sender}-${i}`} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                            <span
                                className={`inline-block px-3 py-1.5 text-sm font-medium max-w-[70%] ${
                                    !msg.valid
                                        ? "line-through opacity-50"
                                        : msg.sender === "me"
                                            ? "bg-[var(--retro-game-info)]/20"
                                            : "bg-[var(--retro-game-panel)]"
                                }`}
                                style={{ color: "var(--retro-game-text)", border: "1px solid var(--retro-game-panel-border-lo)" }}
                            >
                                {msg.text}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-[var(--retro-game-text-dim)]">
                            {ko ? "워밍업 메모" : "Warmup Notes"}
                        </p>
                        {warmupWords.length === 0 ? (
                            <p className="text-sm text-[var(--retro-game-text-dim)]/70">
                                {ko ? "마음대로 단어를 적어보세요. 본게임이 시작되면 모두 초기화됩니다." : "Type anything you want here. Everything resets when the match starts."}
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {warmupWords.map((word, index) => (
                                    <span
                                        key={`${word}-${index}`}
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium"
                                        style={{ color: "var(--retro-game-text)", border: "1px solid var(--retro-game-panel-border-lo)", background: "var(--retro-game-panel)" }}
                                    >
                                        {word}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-[var(--retro-game-panel-border-lo)]">
                <GameInput
                    inputRef={inputRef}
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    disabled={gameOver || validating}
                    placeholder={
                        room.phase === "playing"
                            ? validating
                                ? ko ? "단어 검증 중..." : "Validating..."
                                : mp.isMyTurn
                                    ? ko ? "단어를 입력하세요" : "Type a word"
                                    : ko ? "상대 차례..." : "Opponent's turn..."
                            : ko ? "워밍업 단어를 적어보세요" : "Type warmup words"
                    }
                />
            </div>

            {showCountdown && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 30,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
                }}>
                    <div style={{ textAlign: "center" }}>
                        <p style={{ color: "var(--retro-game-text)", fontSize: 14, marginBottom: 10 }}>
                            {ko ? "공식 대전을 시작합니다" : "Official match starts now"}
                        </p>
                        <p style={{
                            fontSize: 48, fontWeight: 900, letterSpacing: 4,
                            color: "var(--retro-game-warning)", textShadow: "2px 2px 0 #000",
                        }}>
                            {room.countdown}
                        </p>
                    </div>
                </div>
            )}

            {gameOver && room.phase === "finished" && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 40,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
                }}>
                    <div style={{ textAlign: "center" }}>
                        <p style={{
                            fontSize: 32, fontWeight: 900, letterSpacing: 4,
                            color: winner === "me" ? "var(--retro-game-success)" : "var(--retro-game-danger)",
                            textShadow: "2px 2px 0 #000",
                        }}>
                            {winner === "me" ? (ko ? "승리!" : "WIN!") : (ko ? "패배" : "LOSE")}
                        </p>
                        <p style={{ color: "var(--retro-game-text)", fontSize: 14, marginTop: 8 }}>
                            {ko ? "점수" : "Score"}: {score}
                        </p>
                        <Button onClick={onFinish} className="mt-4">
                            {ko ? "로비로" : "LOBBY"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
