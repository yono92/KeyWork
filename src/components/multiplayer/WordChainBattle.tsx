"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useMultiplayerWordChain } from "@/hooks/useMultiplayerWordChain";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useScoreSubmit } from "@/hooks/useScoreSubmit";
import useTypingStore from "@/store/store";
import GameInput from "@/components/game/GameInput";
import { isChainValid, getLastChar } from "@/utils/dueumUtils";
import { HANGUL_WORD_REGEX } from "@/utils/koreanConstants";
import { Button } from "@/components/ui/button";
import type { AvatarConfig } from "@/lib/supabase/types";
import PixelAvatar from "@/components/avatar/PixelAvatar";

async function validateWordApi(word: string): Promise<boolean> {
    try {
        const res = await fetch(`/api/krdict/validate?word=${encodeURIComponent(word)}`);
        if (!res.ok) return true; // API 실패 시 로컬 검증만으로 통과
        const data = await res.json();
        return data.exists === true;
    } catch {
        return true; // 네트워크 오류 시 관대하게 통과
    }
}

interface WordChainBattleProps {
    getChannel: () => RealtimeChannel | null;
    roomId: string;
    isHost: boolean;
    opponentNickname: string;
    opponentAvatarConfig: AvatarConfig | null;
    onFinish: () => void;
}

const TIME_LIMIT = 15;

export default function WordChainBattle({ getChannel, isHost, opponentNickname, opponentAvatarConfig, onFinish }: WordChainBattleProps) {
    const { user, profile } = useAuthContext();
    const { submitScore } = useScoreSubmit();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";
    const myId = user?.id ?? "";

    const mp = useMultiplayerWordChain(getChannel, true, myId);

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ text: string; sender: "me" | "opponent"; valid: boolean }[]>([]);
    const [timer, setTimer] = useState(TIME_LIMIT);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<"me" | "opponent" | null>(null);
    const [validating, setValidating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);
    const usedWordsRef = useRef<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 선공 결정 (호스트 = 랜덤)
    useEffect(() => {
        if (isHost) {
            const iGoFirst = Math.random() > 0.5;
            mp.setIsMyTurn(iGoFirst);
            mp.broadcastTurn(iGoFirst ? myId : "opponent", TIME_LIMIT);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 타이머 — mp의 개별 함수/값만 ref로 캡처하여 불필요한 재시작 방지
    const isMyTurnRef = useRef(mp.isMyTurn);
    const myLivesRef = useRef(mp.myLives);
    isMyTurnRef.current = mp.isMyTurn;
    myLivesRef.current = mp.myLives;

    const setMyLivesStable = mp.setMyLives;
    const broadcastLivesStable = mp.broadcastLives;

    useEffect(() => {
        if (gameOver || validating) return;
        timerRef.current = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    // 타임아웃 → 목숨 감소
                    if (isMyTurnRef.current) {
                        const newLives = myLivesRef.current - 1;
                        setMyLivesStable(newLives);
                        broadcastLivesStable(newLives);
                        if (newLives <= 0) {
                            setGameOver(true);
                            setWinner("opponent");
                        }
                    }
                    return TIME_LIMIT;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameOver, validating, setMyLivesStable, broadcastLivesStable]);

    // 상대 목숨 0 → 내 승리
    useEffect(() => {
        if (mp.opponentLives <= 0 && !gameOver) {
            setGameOver(true);
            setWinner("me");
        }
    }, [mp.opponentLives, gameOver]);

    // 상대 단어 수신
    useEffect(() => {
        if (mp.opponentWord) {
            setMessages((prev) => [...prev, { text: mp.opponentWord!, sender: "opponent", valid: true }]);
            usedWordsRef.current.add(mp.opponentWord.toLowerCase());
            setTimer(TIME_LIMIT);
        }
    }, [mp.opponentWord]);

    // 채팅 자동 스크롤
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    // 단어 제출
    const handleSubmit = useCallback(async () => {
        if (!mp.isMyTurn || !input.trim() || gameOver || validating) return;
        const word = input.trim();
        setInput("");

        if (!HANGUL_WORD_REGEX.test(word)) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
            return;
        }

        if (mp.currentChar && !isChainValid(mp.currentChar, word)) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
            return;
        }

        if (usedWordsRef.current.has(word.toLowerCase())) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
            return;
        }

        // API 검증 (검증 중 타이머 일시정지)
        setValidating(true);
        const isValid = await validateWordApi(word);
        setValidating(false);

        if (!isValid) {
            setMessages((prev) => [...prev, { text: word, sender: "me", valid: false }]);
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
    }, [mp, input, gameOver, validating]);

    // 게임 종료 시 점수 제출
    useEffect(() => {
        if (gameOver && winner) {
            submitScore({
                game_mode: "word-chain",
                score,
                is_multiplayer: true,
                is_win: winner === "me",
            });
        }
    }, [gameOver, winner, score, submitScore]);

    return (
        <div className="relative w-full flex-1 min-h-[280px] overflow-hidden border border-sky-200/40 dark:border-sky-500/10 flex flex-col" style={{ background: "var(--retro-game-bg)" }}>
            {/* 상단 바 */}
            <div className="flex justify-between items-center px-3 py-2 border-b border-[var(--retro-game-panel-border-lo)]" style={{ background: "var(--retro-game-panel)" }}>
                <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--retro-game-text)" }}>
                    <PixelAvatar config={profile?.avatar_config ?? null} nickname={profile?.nickname ?? "?"} size="sm" />
                    {ko ? "나" : "You"}: ❤️{mp.myLives} | {score}
                </div>
                <div className={`text-sm font-black tabular-nums ${timer <= 3 ? "text-red-500" : ""}`} style={{ color: timer <= 3 ? "var(--retro-game-danger)" : "var(--retro-game-warning)" }}>
                    {timer}s
                </div>
                <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--retro-game-text)" }}>
                    <PixelAvatar config={opponentAvatarConfig} nickname={opponentNickname} size="sm" />
                    {ko ? "상대" : "Opp"}: ❤️{mp.opponentLives}
                </div>
            </div>

            {/* 현재 글자 */}
            {mp.currentChar && (
                <div className="text-center py-2 border-b border-[var(--retro-game-panel-border-lo)]">
                    <span className="text-2xl font-black" style={{ color: "var(--retro-game-info)" }}>
                        &quot;{mp.currentChar}&quot;
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--retro-game-text-dim)" }}>
                        {mp.isMyTurn ? (ko ? "내 차례" : "Your turn") : (ko ? "상대 차례" : "Opponent's turn")}
                    </span>
                </div>
            )}

            {/* 채팅 */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
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
                ))}
            </div>

            {/* 입력 */}
            <div className="p-3 border-t border-[var(--retro-game-panel-border-lo)]">
                <GameInput
                    inputRef={inputRef}
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    disabled={!mp.isMyTurn || gameOver || validating}
                    placeholder={validating ? (ko ? "단어 검증 중..." : "Validating...") : mp.isMyTurn ? (ko ? "단어를 입력하세요" : "Type a word") : (ko ? "상대 차례..." : "Opponent's turn...")}
                />
            </div>

            {/* 게임 오버 오버레이 */}
            {gameOver && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 30,
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
