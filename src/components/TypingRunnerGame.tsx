import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/word.json";
import { formatPlayTime } from "../utils/formatting";
import { calculateGameXp } from "../utils/xpUtils";
import { useGameAudio } from "../hooks/useGameAudio";
import { usePauseHandler } from "../hooks/usePauseHandler";
import PauseOverlay from "./game/PauseOverlay";
import GameOverModal from "./game/GameOverModal";
import GameInput from "./game/GameInput";

// --- 게임 상수 ---
const CHAR_X_PERCENT = 15; // 캐릭터 X 위치 (%)
const GROUND_BOTTOM = 22; // 바닥 영역 높이 (%)
const INITIAL_SPEED = 2; // 초기 이동 속도 (px/frame)
const SPEED_INCREMENT = 0.1; // 장애물 클리어 시 속도 증가
const INITIAL_LIVES = 3;
const JUMP_DURATION = 650; // 점프 애니메이션 ms
const HIT_DURATION = 500; // 피격 애니메이션 ms
const HIT_INVINCIBILITY = 1200; // 피격 후 무적 ms

const OBSTACLE_VISUALS = [
    { emoji: "🌵" },
    { emoji: "🪨" },
    { emoji: "📦" },
    { emoji: "🔥" },
];

interface Obstacle {
    id: number;
    x: number;
    word: string;
    cleared: boolean;
    emoji: string;
}

const TypingRunnerGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const language = useTypingStore((s) => s.language);
    const difficulty = useTypingStore((s) => s.difficulty);
    const addXp = useTypingStore((s) => s.addXp);

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(INITIAL_LIVES);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [charState, setCharState] = useState<"running" | "jumping" | "hit">("running");
    const [input, setInput] = useState("");
    const [distance, setDistance] = useState(0);

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const speedRef = useRef(INITIAL_SPEED);
    const obstacleIdRef = useRef(0);
    const clearedCountRef = useRef(0);
    const lastSpawnTimeRef = useRef(0);
    const invincibleRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());
    const maxSpeedRef = useRef(INITIAL_SPEED);

    const { playSound } = useGameAudio();
    usePauseHandler(gameStarted, gameOver, setIsPaused);

    // --- 단어 선택 (난이도 점진 증가) ---
    const getRandomWord = useCallback((): string => {
        const pool = wordsData[language];
        const cleared = clearedCountRef.current;
        const maxLen = cleared < 5 ? 3 : cleared < 15 ? 4 : cleared < 30 ? 5 : 6;
        const minLen = cleared < 15 ? 2 : 3;
        const filtered = pool.filter((w) => w.length >= minLen && w.length <= maxLen);
        const source = filtered.length > 0 ? filtered : pool;
        return source[Math.floor(Math.random() * source.length)];
    }, [language]);

    // --- 타겟 장애물 (가장 가까운 미클리어) ---
    const targetObstacle = useMemo(() => {
        return obstacles
            .filter((o) => !o.cleared)
            .sort((a, b) => a.x - b.x)[0] ?? null;
    }, [obstacles]);

    // --- 카운트다운 ---
    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            setCountdown(null);
            setGameStarted(true);
            gameStartTimeRef.current = Date.now();
            if (inputRef.current) inputRef.current.focus();
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // --- 게임 루프 (이동 + 충돌 + 스폰) ---
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused) return;
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;

        const gameLoop = setInterval(() => {
            const gameWidth = gameArea.offsetWidth;
            const charX = (gameWidth * CHAR_X_PERCENT) / 100;
            const currentSpeed = speedRef.current;

            // 장애물 이동 + 충돌 판정
            setObstacles((prev) => {
                let hitDetected = false;
                const updated = prev.map((o) => {
                    if (o.cleared) return o;
                    const newX = o.x - currentSpeed;
                    if (newX < charX - 30 && !invincibleRef.current) {
                        hitDetected = true;
                        return { ...o, x: newX, cleared: true };
                    }
                    return { ...o, x: newX };
                });

                if (hitDetected) {
                    invincibleRef.current = true;
                    setTimeout(() => {
                        invincibleRef.current = false;
                    }, HIT_INVINCIBILITY);
                    playSound("lifeLost");
                    setCharState("hit");
                    setTimeout(() => setCharState("running"), HIT_DURATION);
                    setLives((l) => {
                        const newL = Math.max(l - 1, 0);
                        if (newL <= 0) {
                            setGameOver(true);
                            playSound("gameOver");
                        }
                        return newL;
                    });
                }

                return updated.filter((o) => o.x > -200);
            });

            // 거리 갱신
            setDistance((d) => d + currentSpeed * 0.1);

            // 장애물 스폰
            const now = Date.now();
            const cleared = clearedCountRef.current;
            const spawnGap = Math.max(1200, 3000 - cleared * 80);

            if (now - lastSpawnTimeRef.current > spawnGap) {
                lastSpawnTimeRef.current = now;
                const word = getRandomWord();
                const visual = OBSTACLE_VISUALS[Math.floor(Math.random() * OBSTACLE_VISUALS.length)];
                setObstacles((prev) => [
                    ...prev,
                    {
                        id: obstacleIdRef.current++,
                        x: gameWidth + 60,
                        word,
                        cleared: false,
                        emoji: visual.emoji,
                    },
                ]);
            }
        }, 16);

        return () => clearInterval(gameLoop);
    }, [gameStarted, gameOver, isPaused, playSound, getRandomWord]);

    // --- 단어 매칭 ---
    const clearTarget = useCallback(() => {
        if (!targetObstacle) return;
        const targetId = targetObstacle.id;

        setObstacles((prev) =>
            prev.map((o) => (o.id === targetId ? { ...o, cleared: true } : o))
        );
        setInput("");
        if (inputRef.current) inputRef.current.value = "";

        clearedCountRef.current += 1;
        const wordScore = targetObstacle.word.length * 10 + Math.round(speedRef.current * 5);
        setScore((s) => s + wordScore);
        speedRef.current += SPEED_INCREMENT;
        if (speedRef.current > maxSpeedRef.current) maxSpeedRef.current = speedRef.current;

        setCharState("jumping");
        playSound("match");
        setTimeout(() => setCharState("running"), JUMP_DURATION);
    }, [targetObstacle, playSound]);

    const handleInput = (val: string) => {
        setInput(val);
        // 자동 매칭 (영어 즉시, 한국어 IME 완성 시)
        if (targetObstacle && val === targetObstacle.word) {
            clearTarget();
        }
    };

    const handleSubmit = () => {
        if (targetObstacle && input === targetObstacle.word) {
            clearTarget();
        } else {
            setInput("");
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    // --- 게임오버 XP ---
    useEffect(() => {
        if (!gameOver) return;
        addXp(calculateGameXp(score / 20, difficulty));
    }, [gameOver, score, addXp, difficulty]);

    // --- 포커스 관리 ---
    useEffect(() => {
        if (!isPaused && !gameOver && gameStarted && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isPaused, gameOver, gameStarted]);

    // --- 재시작 ---
    const restartGame = () => {
        setScore(0);
        setLives(INITIAL_LIVES);
        setObstacles([]);
        setCharState("running");
        setInput("");
        setDistance(0);
        setGameOver(false);
        setGameStarted(false);
        setIsPaused(false);
        speedRef.current = INITIAL_SPEED;
        obstacleIdRef.current = 0;
        clearedCountRef.current = 0;
        lastSpawnTimeRef.current = 0;
        invincibleRef.current = false;
        maxSpeedRef.current = INITIAL_SPEED;
        if (inputRef.current) inputRef.current.value = "";
        setCountdown(3);
    };

    // 지면 애니메이션 속도 (속도에 비례)
    const groundAnimDuration = Math.max(0.4, 2 / (speedRef.current / INITIAL_SPEED));

    return (
        <div
            ref={gameAreaRef}
            className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10"
        >
            <div
                className={`absolute inset-0 ${
                    darkMode
                        ? "bg-gradient-to-b from-[#0a1628] via-[#0e1825] to-[#0e1825]"
                        : "bg-gradient-to-b from-sky-200/60 via-sky-100/40 to-emerald-100/60"
                }`}
            >
                {/* 상단 스코어바 */}
                <div
                    className={`absolute top-0 left-0 right-0 flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                        darkMode
                            ? "bg-white/[0.04] border-white/[0.06]"
                            : "bg-white/70 border-sky-100/50"
                    }`}
                >
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Score: <span className="tabular-nums">{score}</span>
                    </div>
                    <div className={`text-xs sm:text-sm tabular-nums font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {Math.round(distance)}m
                    </div>
                    <div className={`text-sm sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        {"❤️".repeat(Math.max(lives, 0))}
                        {"🖤".repeat(Math.max(INITIAL_LIVES - lives, 0))}
                    </div>
                </div>

                {/* 게임 스테이지 */}
                <div className="absolute inset-0 top-11 sm:top-14 bottom-12 sm:bottom-16 overflow-hidden">
                    {/* 스크롤링 지면 */}
                    <div
                        className={`absolute bottom-0 left-0 right-0 ${
                            darkMode ? "bg-emerald-900/30" : "bg-emerald-200/50"
                        }`}
                        style={{
                            height: `${GROUND_BOTTOM}%`,
                            backgroundImage: darkMode
                                ? "repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 50px)"
                                : "repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(0,0,0,0.05) 48px, rgba(0,0,0,0.05) 50px)",
                            backgroundSize: "50px 100%",
                            animation:
                                gameStarted && !gameOver && !isPaused
                                    ? `runnerGround ${groundAnimDuration}s linear infinite`
                                    : "none",
                        }}
                    >
                        <div
                            className={`absolute top-0 left-0 right-0 h-0.5 ${
                                darkMode ? "bg-emerald-400/40" : "bg-emerald-500/50"
                            }`}
                        />
                    </div>

                    {/* 캐릭터 */}
                    <div
                        className={`absolute z-10 text-3xl sm:text-5xl select-none ${
                            charState === "jumping"
                                ? "animate-runner-jump"
                                : charState === "hit"
                                ? "animate-runner-hit"
                                : gameStarted && !gameOver
                                ? "animate-runner-bounce"
                                : ""
                        }`}
                        style={{
                            left: `${CHAR_X_PERCENT}%`,
                            bottom: `${GROUND_BOTTOM}%`,
                            transform: "translateX(-50%)",
                        }}
                    >
                        {charState === "hit" ? "😵" : "🏃"}
                    </div>

                    {/* 장애물들 */}
                    {obstacles
                        .filter((o) => !o.cleared)
                        .map((o) => {
                            const isTarget = targetObstacle?.id === o.id;
                            return (
                                <div
                                    key={o.id}
                                    className="absolute select-none"
                                    style={{
                                        left: `${o.x}px`,
                                        bottom: `${GROUND_BOTTOM}%`,
                                    }}
                                >
                                    {/* 단어 라벨 */}
                                    <div
                                        className={`absolute -top-8 sm:-top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md transition-all ${
                                            isTarget
                                                ? `text-sm sm:text-lg font-black ${
                                                      darkMode
                                                          ? "text-sky-300 bg-sky-500/10"
                                                          : "text-sky-600 bg-sky-100/80"
                                                  } shadow-sm`
                                                : `text-[10px] sm:text-xs font-medium ${
                                                      darkMode ? "text-slate-600" : "text-slate-400"
                                                  }`
                                        }`}
                                    >
                                        {isTarget && input.length > 0 ? (
                                            <span>
                                                {o.word.split("").map((ch, i) => (
                                                    <span
                                                        key={i}
                                                        className={
                                                            i < input.length
                                                                ? input[i] === ch
                                                                    ? "text-emerald-400"
                                                                    : "text-rose-500"
                                                                : ""
                                                        }
                                                    >
                                                        {ch}
                                                    </span>
                                                ))}
                                            </span>
                                        ) : (
                                            o.word
                                        )}
                                    </div>
                                    {/* 장애물 이모지 */}
                                    <div className="text-2xl sm:text-4xl">{o.emoji}</div>
                                </div>
                            );
                        })}

                    {/* 장식 구름 */}
                    <div
                        className={`absolute top-[8%] text-3xl opacity-20 pointer-events-none ${
                            gameStarted && !gameOver && !isPaused ? "animate-runner-cloud" : ""
                        }`}
                        style={{ right: "15%" }}
                    >
                        ☁️
                    </div>
                    <div
                        className={`absolute top-[20%] text-2xl opacity-15 pointer-events-none ${
                            gameStarted && !gameOver && !isPaused ? "animate-runner-cloud-slow" : ""
                        }`}
                        style={{ right: "55%" }}
                    >
                        ☁️
                    </div>
                </div>

                {/* 입력 영역 */}
                <div
                    className={`absolute bottom-0 left-0 right-0 p-2 sm:p-3 backdrop-blur-sm border-t ${
                        darkMode
                            ? "bg-white/[0.04] border-white/[0.06]"
                            : "bg-white/70 border-sky-100/50"
                    }`}
                >
                    <GameInput
                        inputRef={inputRef}
                        value={input}
                        onChange={handleInput}
                        onSubmit={handleSubmit}
                        disabled={!gameStarted || isPaused || gameOver}
                        placeholder={language === "korean" ? "" : "Type the word..."}
                    />
                </div>
            </div>

            {/* 시작 오버레이 */}
            {!gameStarted && !gameOver && countdown === null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="text-5xl mb-4">🏃</div>
                        <h2 className="text-2xl sm:text-4xl font-black text-white mb-2">
                            {language === "korean" ? "타이핑 러너" : "Typing Runner"}
                        </h2>
                        <p className="text-sm sm:text-base mb-6 text-slate-300">
                            {language === "korean"
                                ? "단어를 타이핑해서 장애물을 뛰어넘으세요!"
                                : "Type words to jump over obstacles!"}
                        </p>
                        <button
                            onClick={() => restartGame()}
                            className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 transition-all shadow-lg hover:shadow-emerald-500/25 text-lg"
                        >
                            {language === "korean" ? "시작" : "Start"}
                        </button>
                    </div>
                </div>
            )}

            {/* 카운트다운 */}
            {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div
                        key={countdown}
                        className="animate-countdown text-7xl sm:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(56,189,248,0.6)]"
                    >
                        {countdown}
                    </div>
                </div>
            )}

            {/* 일시정지 */}
            {isPaused && !gameOver && <PauseOverlay language={language} />}

            {/* 게임오버 */}
            {gameOver && (
                <GameOverModal
                    title="Game Over!"
                    primaryStat={
                        <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            Score: <span className="font-bold tabular-nums">{score.toLocaleString()}</span>
                        </p>
                    }
                    stats={[
                        {
                            label: language === "korean" ? "이동 거리" : "Distance",
                            value: `${Math.round(distance)}m`,
                        },
                        {
                            label: language === "korean" ? "클리어 장애물" : "Cleared",
                            value: `${clearedCountRef.current}${language === "korean" ? "개" : ""}`,
                        },
                        {
                            label: language === "korean" ? "최고 속도" : "Max speed",
                            value: `${maxSpeedRef.current.toFixed(1)}x`,
                        },
                        {
                            label: language === "korean" ? "플레이 시간" : "Play time",
                            value: formatPlayTime(
                                Date.now() - gameStartTimeRef.current,
                                language === "korean" ? "ko" : "en"
                            ),
                        },
                    ]}
                    buttons={[
                        {
                            label: language === "korean" ? "다시 하기" : "Play Again",
                            onClick: () => restartGame(),
                            primary: true,
                        },
                    ]}
                />
            )}
        </div>
    );
};

export default TypingRunnerGame;
