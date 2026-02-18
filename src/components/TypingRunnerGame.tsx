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
const CHAR_X_PERCENT = 15;
const GROUND_BOTTOM = 22;
const INITIAL_SPEED = 2;
const SPEED_INCREMENT = 0.1;
const INITIAL_LIVES = 3;
const JUMP_DURATION = 650;
const HIT_DURATION = 500;
const HIT_INVINCIBILITY = 1200;

const OBSTACLE_VISUALS = [
    { emoji: "🌵", bg: "from-emerald-500/20 to-emerald-600/10" },
    { emoji: "🪨", bg: "from-slate-500/20 to-slate-600/10" },
    { emoji: "📦", bg: "from-amber-500/20 to-amber-600/10" },
    { emoji: "🔥", bg: "from-rose-500/20 to-rose-600/10" },
];

interface Obstacle {
    id: number;
    x: number;
    word: string;
    cleared: boolean;
    emoji: string;
    bg: string;
}

interface ScorePopup {
    id: number;
    text: string;
    x: number;
    bottom: number;
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
    const [isInvincible, setIsInvincible] = useState(false);
    const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);

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

    // --- 점수 팝업 ---
    const showScorePopup = (text: string, x: number) => {
        const id = Date.now() + Math.random();
        setScorePopups((prev) => [...prev, { id, text, x, bottom: GROUND_BOTTOM + 8 }]);
        setTimeout(() => {
            setScorePopups((prev) => prev.filter((p) => p.id !== id));
        }, 800);
    };

    // --- 단어 선택 ---
    const getRandomWord = useCallback((): string => {
        const pool = wordsData[language];
        const cleared = clearedCountRef.current;
        const maxLen = cleared < 5 ? 3 : cleared < 15 ? 4 : cleared < 30 ? 5 : 6;
        const minLen = cleared < 15 ? 2 : 3;
        const filtered = pool.filter((w) => w.length >= minLen && w.length <= maxLen);
        const source = filtered.length > 0 ? filtered : pool;
        return source[Math.floor(Math.random() * source.length)];
    }, [language]);

    // --- 타겟 장애물 ---
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

    // --- 게임 루프 ---
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused) return;
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;

        const gameLoop = setInterval(() => {
            const gameWidth = gameArea.offsetWidth;
            const charX = (gameWidth * CHAR_X_PERCENT) / 100;
            const currentSpeed = speedRef.current;

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
                    setIsInvincible(true);
                    setTimeout(() => {
                        invincibleRef.current = false;
                        setIsInvincible(false);
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

            setDistance((d) => d + currentSpeed * 0.1);

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
                        bg: visual.bg,
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
        const targetX = targetObstacle.x;

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

        showScorePopup(`+${wordScore}`, targetX);

        setCharState("jumping");
        playSound("match");
        setTimeout(() => setCharState("running"), JUMP_DURATION);
    }, [targetObstacle, playSound]);

    const handleInput = (val: string) => {
        setInput(val);
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

    // --- 포커스 ---
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
        setIsInvincible(false);
        setScorePopups([]);
        speedRef.current = INITIAL_SPEED;
        obstacleIdRef.current = 0;
        clearedCountRef.current = 0;
        lastSpawnTimeRef.current = 0;
        invincibleRef.current = false;
        maxSpeedRef.current = INITIAL_SPEED;
        if (inputRef.current) inputRef.current.value = "";
        setCountdown(3);
    };

    const groundAnimDuration = Math.max(0.4, 2 / (speedRef.current / INITIAL_SPEED));

    return (
        <div
            ref={gameAreaRef}
            className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10"
        >
            <div
                className={`absolute inset-0 ${
                    darkMode
                        ? "bg-gradient-to-b from-[#0a1628] via-[#0e1825] to-[#122218]"
                        : "bg-gradient-to-b from-sky-300/50 via-sky-200/40 to-emerald-100/60"
                }`}
            >
                {/* ===== 상단 스코어바 ===== */}
                <div
                    className={`absolute top-0 left-0 right-0 flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-20 ${
                        darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                    }`}
                >
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        <span className="tabular-nums">{score.toLocaleString()}</span>
                        <span className={`ml-1.5 text-[10px] sm:text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            pts
                        </span>
                    </div>
                    <div className={`flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        <span className="tabular-nums">{Math.round(distance)}m</span>
                        <span className={`px-1.5 py-0.5 rounded ${darkMode ? "bg-white/5" : "bg-slate-100"}`}>
                            {speedRef.current.toFixed(1)}x
                        </span>
                    </div>
                    <div className="text-sm sm:text-lg font-bold">
                        {"❤️".repeat(Math.max(lives, 0))}
                        {"🖤".repeat(Math.max(INITIAL_LIVES - lives, 0))}
                    </div>
                </div>

                {/* ===== 게임 스테이지 ===== */}
                <div className="absolute inset-0 top-11 sm:top-14 bottom-12 sm:bottom-16 overflow-hidden">

                    {/* 배경 산/언덕 실루엣 */}
                    <div className="absolute bottom-[22%] left-0 right-0 pointer-events-none">
                        <svg viewBox="0 0 1200 120" className={`w-full h-10 sm:h-16 ${darkMode ? "fill-emerald-900/20" : "fill-emerald-300/30"}`} preserveAspectRatio="none">
                            <path d="M0,120 L0,80 Q100,20 200,60 Q350,10 450,50 Q550,0 700,40 Q800,10 900,45 Q1050,5 1200,55 L1200,120 Z" />
                        </svg>
                    </div>

                    {/* 구름들 */}
                    <div className={`absolute top-[6%] text-4xl sm:text-5xl pointer-events-none ${darkMode ? "opacity-10" : "opacity-25"} ${gameStarted && !gameOver && !isPaused ? "animate-runner-cloud" : ""}`} style={{ right: "10%" }}>
                        ☁️
                    </div>
                    <div className={`absolute top-[15%] text-2xl sm:text-3xl pointer-events-none ${darkMode ? "opacity-[0.06]" : "opacity-15"} ${gameStarted && !gameOver && !isPaused ? "animate-runner-cloud-slow" : ""}`} style={{ right: "50%" }}>
                        ☁️
                    </div>
                    <div className={`absolute top-[10%] text-xl pointer-events-none ${darkMode ? "opacity-[0.04]" : "opacity-10"} ${gameStarted && !gameOver && !isPaused ? "animate-runner-cloud" : ""}`} style={{ right: "75%" }}>
                        ☁️
                    </div>

                    {/* 지면 - 다층 구조 */}
                    <div className="absolute bottom-0 left-0 right-0" style={{ height: `${GROUND_BOTTOM}%` }}>
                        {/* 잔디 줄 */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 ${darkMode ? "bg-emerald-500/40" : "bg-emerald-500/60"}`} />
                        {/* 흙 레이어 */}
                        <div
                            className={`absolute inset-0 top-1.5 sm:top-2 ${darkMode ? "bg-[#1a2a1a]" : "bg-gradient-to-b from-emerald-200/70 to-amber-100/50"}`}
                            style={{
                                backgroundImage: darkMode
                                    ? "repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(255,255,255,0.02) 38px, rgba(255,255,255,0.02) 40px), repeating-linear-gradient(180deg, transparent, transparent 8px, rgba(255,255,255,0.01) 8px, rgba(255,255,255,0.01) 10px)"
                                    : "repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(0,0,0,0.03) 38px, rgba(0,0,0,0.03) 40px), repeating-linear-gradient(180deg, transparent, transparent 8px, rgba(0,0,0,0.02) 8px, rgba(0,0,0,0.02) 10px)",
                                backgroundSize: "40px 10px",
                                animation: gameStarted && !gameOver && !isPaused
                                    ? `runnerGround ${groundAnimDuration}s linear infinite`
                                    : "none",
                            }}
                        />
                    </div>

                    {/* ===== 캐릭터 ===== */}
                    <div
                        className={`absolute z-10 select-none ${
                            charState === "jumping"
                                ? "animate-runner-jump"
                                : charState === "hit"
                                ? "animate-runner-hit"
                                : gameStarted && !gameOver
                                ? "animate-runner-bounce"
                                : ""
                        } ${isInvincible ? "animate-runner-blink" : ""}`}
                        style={{
                            left: `${CHAR_X_PERCENT}%`,
                            bottom: `${GROUND_BOTTOM}%`,
                        }}
                    >
                        {/* 캐릭터 그림자 */}
                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 sm:w-10 sm:h-2.5 rounded-full ${
                            darkMode ? "bg-black/30" : "bg-black/15"
                        } ${charState === "jumping" ? "scale-50 opacity-50" : ""} transition-all`} />
                        {/* 캐릭터 이모지 (오른쪽 바라보도록 flip) */}
                        <div className="text-3xl sm:text-5xl" style={{ transform: "scaleX(-1)" }}>
                            {charState === "hit" ? "😵" : "🏃"}
                        </div>
                    </div>

                    {/* ===== 장애물들 ===== */}
                    {obstacles
                        .filter((o) => !o.cleared)
                        .map((o) => {
                            const isTarget = targetObstacle?.id === o.id;
                            return (
                                <div
                                    key={o.id}
                                    className="absolute select-none animate-word-spawn"
                                    style={{
                                        left: `${o.x}px`,
                                        bottom: `${GROUND_BOTTOM}%`,
                                    }}
                                >
                                    {/* 단어 라벨 */}
                                    <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-200 ${
                                        isTarget ? "-top-12 sm:-top-14" : "-top-8 sm:-top-10"
                                    }`}>
                                        <div className={`px-2.5 py-1 rounded-lg border transition-all ${
                                            isTarget
                                                ? darkMode
                                                    ? "text-sm sm:text-lg font-black text-sky-300 bg-sky-500/15 border-sky-500/30 shadow-lg shadow-sky-500/10"
                                                    : "text-sm sm:text-lg font-black text-sky-700 bg-white/90 border-sky-300/60 shadow-lg shadow-sky-200/50"
                                                : darkMode
                                                    ? "text-[10px] sm:text-xs font-medium text-slate-600 bg-transparent border-transparent"
                                                    : "text-[10px] sm:text-xs font-medium text-slate-400 bg-transparent border-transparent"
                                        }`}>
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
                                        {/* 타겟 화살표 */}
                                        {isTarget && (
                                            <div className={`w-0 h-0 mx-auto border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent ${
                                                darkMode ? "border-t-sky-500/30" : "border-t-sky-300/60"
                                            }`} />
                                        )}
                                    </div>

                                    {/* 장애물 본체 */}
                                    <div className={`relative flex items-end justify-center rounded-lg px-1 pt-1 pb-0.5 bg-gradient-to-t ${o.bg} ${
                                        darkMode ? "border border-white/5" : "border border-black/5"
                                    }`}>
                                        <div className="text-2xl sm:text-4xl leading-none">{o.emoji}</div>
                                        {/* 장애물 그림자 */}
                                        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-[80%] h-1 rounded-full ${
                                            darkMode ? "bg-black/20" : "bg-black/10"
                                        }`} />
                                    </div>
                                </div>
                            );
                        })}

                    {/* 점수 팝업 */}
                    {scorePopups.map((p) => (
                        <div
                            key={p.id}
                            className="absolute animate-score-popup z-20 text-sm sm:text-lg font-bold text-emerald-400 pointer-events-none"
                            style={{ left: `${p.x}px`, bottom: `${p.bottom}%` }}
                        >
                            {p.text}
                        </div>
                    ))}
                </div>

                {/* ===== 입력 영역 ===== */}
                <div
                    className={`absolute bottom-0 left-0 right-0 p-2 sm:p-3 backdrop-blur-sm border-t ${
                        darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
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

            {/* ===== 시작 오버레이 ===== */}
            {!gameStarted && !gameOver && countdown === null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`text-center px-8 py-8 rounded-2xl border ${
                        darkMode ? "bg-[#162032]/90 border-white/10" : "bg-white/90 border-sky-100"
                    } shadow-2xl max-w-xs mx-4`}>
                        <div className="text-5xl mb-3" style={{ transform: "scaleX(-1)" }}>🏃</div>
                        <h2 className={`text-2xl sm:text-3xl font-black mb-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {language === "korean" ? "타이핑 러너" : "Typing Runner"}
                        </h2>
                        <p className={`text-sm mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {language === "korean"
                                ? "단어를 타이핑해서 장애물을 뛰어넘으세요!"
                                : "Type words to jump over obstacles!"}
                        </p>
                        <p className={`text-xs mb-5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {language === "korean"
                                ? "갈수록 빨라지고 단어가 길어집니다"
                                : "Speed and word length increase over time"}
                        </p>
                        <button
                            onClick={() => restartGame()}
                            className="w-full px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 transition-all shadow-lg hover:shadow-emerald-500/25 text-lg"
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
