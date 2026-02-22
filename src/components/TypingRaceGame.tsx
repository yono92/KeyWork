import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import proverbsData from "../data/proverbs.json";
import { formatPlayTime } from "../utils/formatting";
import { calculateGameXp } from "../utils/xpUtils";
import { useGameAudio } from "../hooks/useGameAudio";
import { usePauseHandler } from "../hooks/usePauseHandler";
import PauseOverlay from "./game/PauseOverlay";
import GameOverModal from "./game/GameOverModal";
import GameInput from "./game/GameInput";
import { Button } from "@/components/ui/button";

// 라운드별 AI 속도: 15 WPM에서 시작, 라운드마다 +5 WPM (R1=15, R2=20, R3=25...)
const BASE_AI_WPM = 15;
const WPM_PER_ROUND = 5;
const INITIAL_LIVES = 3;

const TypingRaceGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const language = useTypingStore((s) => s.language);
    const difficulty = useTypingStore((s) => s.difficulty);
    const addXp = useTypingStore((s) => s.addXp);

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [countdown, setCountdown] = useState(0); // 3-2-1 카운트다운

    const [lives, setLives] = useState(INITIAL_LIVES);
    const [round, setRound] = useState(1);
    const [sentence, setSentence] = useState("");
    const [input, setInput] = useState("");
    const [aiProgress, setAiProgress] = useState(0); // 0~100%
    const [playerWpm, setPlayerWpm] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const roundStartTimeRef = useRef(Date.now());
    const playerCharsTypedRef = useRef(0);
    const usedIndicesRef = useRef<Set<number>>(new Set());
    const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 통계
    const totalCharsRef = useRef(0);
    const totalCorrectRef = useRef(0);
    const roundsWonRef = useRef(0);
    const gameStartTimeRef = useRef(Date.now());

    // 현재 라운드의 AI WPM
    const aiWpm = BASE_AI_WPM + (round - 1) * WPM_PER_ROUND;

    const { playSound } = useGameAudio();

    // ESC 일시정지
    usePauseHandler(gameStarted, gameOver, setIsPaused);

    const getRandomSentence = useCallback((): string => {
        const sentences = proverbsData[language];
        const available = sentences.filter((_, i) => !usedIndicesRef.current.has(i));
        const pool = available.length > 0 ? available : sentences;
        const idx = sentences.indexOf(pool[Math.floor(Math.random() * pool.length)]);
        usedIndicesRef.current.add(idx);
        return sentences[idx];
    }, [language]);

    const startRound = useCallback(() => {
        const s = getRandomSentence();
        setSentence(s);
        setInput("");
        setAiProgress(0);
        roundStartTimeRef.current = Date.now();
        playerCharsTypedRef.current = 0;
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
        }
    }, [getRandomSentence]);

    // 카운트다운 로직
    useEffect(() => {
        if (countdown <= 0) return;

        if (countdown === 1) {
            // GO! → 실제 게임 시작
            playSound("go");
            const timer = setTimeout(() => {
                setCountdown(0);
                roundStartTimeRef.current = Date.now();
            }, 600);
            return () => clearTimeout(timer);
        }

        playSound("countdown");
        const timer = setTimeout(() => {
            setCountdown((c) => c - 1);
        }, 800);
        return () => clearTimeout(timer);
    }, [countdown, playSound]);

    // AI 진행 루프
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || !sentence || countdown > 0) return;

        // AI WPM → chars/ms (1 word ≈ 5 chars)
        const charsPerMs = (aiWpm * 5) / 60000;
        const totalChars = sentence.length;

        aiIntervalRef.current = setInterval(() => {
            setAiProgress(() => {
                const elapsed = Date.now() - roundStartTimeRef.current;
                const aiChars = charsPerMs * elapsed;
                const pct = Math.min((aiChars / totalChars) * 100, 100);
                return pct;
            });
        }, 50);

        return () => {
            if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        };
    }, [gameStarted, gameOver, isPaused, sentence, aiWpm, countdown]);

    // AI가 100% 도달 시 → 라이프 감소
    useEffect(() => {
        if (aiProgress >= 100 && gameStarted && !gameOver) {
            playSound("wrong");
            setLives((prev) => {
                const newLives = prev - 1;
                if (newLives <= 0) {
                    setGameOver(true);
                    playSound("lose");
                } else {
                    setRound((r) => r + 1);
                    setTimeout(() => startRound(), 500);
                }
                return Math.max(newLives, 0);
            });
            setAiProgress(0);
        }
    }, [aiProgress, gameStarted, gameOver, playSound, startRound]);

    // 플레이어 WPM 계산
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused) return;
        const interval = setInterval(() => {
            const elapsed = (Date.now() - roundStartTimeRef.current) / 60000;
            if (elapsed > 0 && playerCharsTypedRef.current > 0) {
                setPlayerWpm(Math.round((playerCharsTypedRef.current / 5) / elapsed));
            }
        }, 500);
        return () => clearInterval(interval);
    }, [gameStarted, gameOver, isPaused]);

    // 일시정지 해제/카운트다운 종료 시 포커스
    useEffect(() => {
        if (!isPaused && !gameOver && countdown === 0 && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver, countdown]);

    const getCorrectChars = (text: string, userInput: string): number => {
        let count = 0;
        for (let i = 0; i < userInput.length && i < text.length; i++) {
            if (userInput[i] === text[i]) count++;
            else break;
        }
        return count;
    };

    const playerProgress = sentence.length > 0
        ? (getCorrectChars(sentence, input) / sentence.length) * 100
        : 0;

    const handleInput = (val: string) => {
        setInput(val);
        playerCharsTypedRef.current = val.length;

        // per-character 정확도 추적: 새로 입력된 마지막 글자 기준
        const newLen = val.length;
        const prevLen = totalCharsRef.current > 0 ? input.length : 0;
        if (newLen > prevLen) {
            const addedCount = newLen - prevLen;
            totalCharsRef.current += addedCount;
            // 새로 입력된 각 글자가 맞는지 확인
            for (let i = prevLen; i < newLen; i++) {
                if (i < sentence.length && val[i] === sentence[i]) {
                    totalCorrectRef.current++;
                }
            }
        }

        // 플레이어가 문장 완료
        if (val === sentence) {
            // AI 진행 즉시 중지
            if (aiIntervalRef.current) {
                clearInterval(aiIntervalRef.current);
                aiIntervalRef.current = null;
            }
            setAiProgress(0);

            roundsWonRef.current += 1;
            playSound("roundComplete");
            setRound((r) => r + 1);
            setTimeout(() => startRound(), 500);
        }
    };

    const restartGame = () => {
        setLives(INITIAL_LIVES);
        setRound(1);
        setGameOver(false);
        setIsPaused(false);
        setInput("");
        setAiProgress(0);
        setPlayerWpm(0);
        usedIndicesRef.current.clear();
        totalCharsRef.current = 0;
        totalCorrectRef.current = 0;
        roundsWonRef.current = 0;
        gameStartTimeRef.current = Date.now();
        playerCharsTypedRef.current = 0;
        if (inputRef.current) {
            inputRef.current.value = "";
        }

        setGameStarted(true);
        const s = proverbsData[language][Math.floor(Math.random() * proverbsData[language].length)];
        setSentence(s);
        setCountdown(3);
    };

    // 게임오버 시 XP 지급
    useEffect(() => {
        if (!gameOver) return;
        const accuracy = totalCharsRef.current > 0
            ? (totalCorrectRef.current / totalCharsRef.current) * 100
            : 0;
        const baseXp = roundsWonRef.current * 5 + accuracy * 0.1;
        addXp(calculateGameXp(baseXp, difficulty));
    }, [gameOver, addXp, difficulty]);

    return (
        <div className={`relative w-full flex-1 min-h-[280px] sm:min-h-[400px] overflow-hidden border-2 ${
            retroTheme === "mac-classic"
                ? "rounded-xl border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
                : "rounded-none border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
        }`}>
            <div className="absolute inset-0 flex flex-col bg-[var(--retro-surface)]">
                {/* 상단 스코어바 */}
                <div className="flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 border-b border-[var(--retro-border-mid)] z-10">
                    <div className="text-xs sm:text-sm font-medium text-[var(--retro-text)]">
                        Round <span className="font-bold tabular-nums">{round}</span>
                    </div>
                    <div className="text-sm sm:text-lg font-bold text-[var(--retro-text)]">
                        {"❤️".repeat(Math.max(lives, 0))}
                        {"🖤".repeat(Math.max(INITIAL_LIVES - lives, 0))}
                    </div>
                </div>

                {/* 레이스 트랙 영역 */}
                <div className="flex-1 flex flex-col justify-center px-3 gap-3 sm:px-6 sm:gap-6">
                    {/* 플레이어 트랙 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--retro-text)]">
                                Player
                            </span>
                            <span className="text-xs tabular-nums text-[var(--retro-text)]/70">
                                {playerWpm} WPM
                            </span>
                        </div>
                        <div className={`relative h-7 sm:h-10 overflow-hidden border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] ${
                            retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
                        }`}>
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-cyan-400 rounded-xl transition-all duration-150 ease-out"
                                style={{ width: `${Math.min(playerProgress, 100)}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 text-xl transition-all duration-150 ease-out"
                                style={{ left: `calc(${Math.min(playerProgress, 97)}% - 10px)` }}
                            >
                                🏃
                            </div>
                        </div>
                    </div>

                    {/* AI 트랙 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--retro-text)]">
                                AI
                            </span>
                            <span className="text-xs tabular-nums text-[var(--retro-text)]/70">
                                {aiWpm} WPM
                            </span>
                        </div>
                        <div className={`relative h-7 sm:h-10 overflow-hidden border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] ${
                            retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
                        }`}>
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-pink-400 rounded-xl transition-all duration-150 ease-out"
                                style={{ width: `${Math.min(aiProgress, 100)}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 text-xl transition-all duration-150 ease-out"
                                style={{ left: `calc(${Math.min(aiProgress, 97)}% - 10px)` }}
                            >
                                🤖
                            </div>
                        </div>
                        <div className="text-[10px] mt-1 text-right tabular-nums text-[var(--retro-text)]/60">
                            {aiWpm} WPM
                        </div>
                    </div>

                    {/* 문장 표시 */}
                    {sentence && (
                        <div className={`p-4 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface-alt)] ${
                            retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
                        }`}>
                            <p className="text-sm sm:text-lg leading-relaxed font-mono tracking-wide">
                                {sentence.split("").map((char, idx) => {
                                    let className = darkMode ? "text-slate-500" : "text-slate-400";
                                    if (idx < input.length) {
                                        className = input[idx] === char
                                            ? "text-emerald-500"
                                            : "text-rose-500 underline decoration-rose-400/50";
                                    }
                                    return <span key={idx} className={className}>{char}</span>;
                                })}
                            </p>
                        </div>
                    )}
                </div>

                {/* 하단 입력 */}
                <div className="p-2.5 sm:p-4 border-t border-[var(--retro-border-mid)] bg-[var(--retro-surface)]">
                    <GameInput
                        inputRef={inputRef}
                        value={input}
                        onChange={handleInput}
                        disabled={!gameStarted || isPaused || gameOver || countdown > 0}
                        placeholder={countdown > 0 ? "" : (language === "korean" ? "문장을 입력하세요..." : "Type the sentence...")}
                    />
                </div>
            </div>

            {/* 시작 오버레이 */}
            {!gameStarted && !gameOver && countdown === 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
                    <div className={`text-center border-2 px-8 py-7 bg-[var(--retro-surface)] ${
                        retroTheme === "mac-classic"
                            ? "rounded-xl border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
                            : "rounded-none border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
                    }`}>
                        <h2 className="text-2xl sm:text-4xl font-black text-[var(--retro-text)] mb-2">
                            {language === "korean" ? "타이핑 레이스" : "Typing Race"}
                        </h2>
                        <p className="text-sm sm:text-base mb-6 text-[var(--retro-text)]/80">
                            {language === "korean"
                                ? "AI와 속도 대결! 라운드마다 AI가 빨라집니다"
                                : "Race the AI! It gets faster each round"}
                        </p>
                        <Button
                            onClick={() => restartGame()}
                            variant="secondary"
                            className={`px-8 py-3 font-bold text-lg ${
                                retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
                            }`}
                        >
                            {language === "korean" ? "시작" : "Start"}
                        </Button>
                    </div>
                </div>
            )}

            {/* 카운트다운 오버레이 */}
            {countdown > 0 && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30">
                    <div className="text-center animate-panel-in">
                        <div className={`text-5xl sm:text-8xl font-black tabular-nums ${countdown === 1 ? "text-emerald-400" : "text-white"}`}
                            key={countdown}
                            style={{ animation: "countdownPop 0.6s ease-out" }}
                        >
                            {countdown === 1 ? (language === "korean" ? "GO!" : "GO!") : countdown - 1}
                        </div>
                    </div>
                </div>
            )}

            {/* 일시정지 */}
            {isPaused && !gameOver && <PauseOverlay language={language} />}

            {/* 게임 오버 */}
            {gameOver && (
                <GameOverModal
                    title="Game Over!"
                    primaryStat={
                        <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {language === "korean" ? "도달 라운드" : "Round reached"}: <span className="font-bold tabular-nums">{round}</span>
                        </p>
                    }
                    stats={[
                        { label: language === "korean" ? "클리어 라운드" : "Rounds won", value: roundsWonRef.current },
                        { label: language === "korean" ? "최종 AI 속도" : "Final AI speed", value: `${aiWpm} WPM` },
                        { label: language === "korean" ? "최종 WPM" : "Your WPM", value: playerWpm },
                        { label: language === "korean" ? "플레이 시간" : "Play time", value: formatPlayTime(Date.now() - gameStartTimeRef.current, language === "korean" ? "ko" : "en") },
                    ]}
                    buttons={[
                        { label: language === "korean" ? "다시 하기" : "Play Again", onClick: () => restartGame(), primary: true },
                    ]}
                />
            )}
        </div>
    );
};

export default TypingRaceGame;
