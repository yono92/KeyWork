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

import { pickRandomStarts, HANGUL_WORD_REGEX } from "../utils/koreanConstants";

const OBSTACLE_TYPES: Array<"cactus" | "rock" | "crate" | "fire"> = ["cactus", "rock", "crate", "fire"];

interface Obstacle {
    id: number;
    x: number;
    word: string;
    cleared: boolean;
    clearedAt?: number;
    type: "cactus" | "rock" | "crate" | "fire";
}

interface ScorePopup {
    id: number;
    text: string;
    x: number;
    bottom: number;
}

interface DustParticle {
    id: number;
    dx: number;
}

interface ClearParticle {
    id: number;
    x: number;
    bottom: number;
    color: string;
    angle: number;
}

// --- 하늘 색상 보간 ---
function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
}

function getSkyGradient(dist: number, dark: boolean): string {
    if (dark) {
        const stops: Array<{ d: number; top: [number, number, number]; bot: [number, number, number] }> = [
            { d: 0, top: [10, 22, 40], bot: [18, 34, 24] },
            { d: 500, top: [14, 26, 48], bot: [20, 38, 28] },
            { d: 1500, top: [30, 20, 60], bot: [24, 30, 40] },
            { d: 3000, top: [6, 14, 30], bot: [12, 22, 18] },
        ];
        let i = 0;
        while (i < stops.length - 1 && dist > stops[i + 1].d) i++;
        if (i >= stops.length - 1) {
            return `linear-gradient(to bottom, ${lerpColor(stops[stops.length - 1].top, stops[stops.length - 1].top, 0)}, ${lerpColor(stops[stops.length - 1].bot, stops[stops.length - 1].bot, 0)})`;
        }
        const t = Math.min(1, (dist - stops[i].d) / (stops[i + 1].d - stops[i].d));
        const top = lerpColor(stops[i].top, stops[i + 1].top, t);
        const bot = lerpColor(stops[i].bot, stops[i + 1].bot, t);
        return `linear-gradient(to bottom, ${top}, ${bot})`;
    }
    const stops: Array<{ d: number; top: [number, number, number]; bot: [number, number, number] }> = [
        { d: 0, top: [135, 206, 235], bot: [200, 240, 220] },
        { d: 500, top: [100, 180, 220], bot: [180, 230, 200] },
        { d: 1500, top: [240, 170, 120], bot: [250, 200, 180] },
        { d: 3000, top: [50, 50, 120], bot: [80, 80, 100] },
    ];
    let i = 0;
    while (i < stops.length - 1 && dist > stops[i + 1].d) i++;
    if (i >= stops.length - 1) {
        return `linear-gradient(to bottom, ${lerpColor(stops[stops.length - 1].top, stops[stops.length - 1].top, 0)}, ${lerpColor(stops[stops.length - 1].bot, stops[stops.length - 1].bot, 0)})`;
    }
    const t = Math.min(1, (dist - stops[i].d) / (stops[i + 1].d - stops[i].d));
    const top = lerpColor(stops[i].top, stops[i + 1].top, t);
    const bot = lerpColor(stops[i].bot, stops[i + 1].bot, t);
    return `linear-gradient(to bottom, ${top}, ${bot})`;
}

// --- 장애물 색상 맵 ---
const OBSTACLE_CLEAR_COLORS: Record<string, string> = {
    cactus: "#34d399",
    rock: "#94a3b8",
    crate: "#fbbf24",
    fire: "#fb923c",
};

// --- SVG 픽셀아트 캐릭터 ---
const PixelCharacter: React.FC<{ state: "running" | "jumping" | "hit"; frame: 0 | 1 }> = ({ state, frame }) => {
    // 12x16 grid, each cell = 1 unit
    const skin = "#f5c6a0";
    const hair = "#4a3728";
    const eye = "#1a1a2e";
    const shirt = "#38bdf8";
    const pants = "#475569";
    const shoe = "#ef4444";

    const hitEye = state === "hit";

    // Leg positions for running animation
    const leftLegX = frame === 0 ? 3 : 5;
    const rightLegX = frame === 0 ? 7 : 5;
    const leftFootX = frame === 0 ? 2 : 5;
    const rightFootX = frame === 0 ? 8 : 6;

    // Arm position for jump
    const armRaised = state === "jumping";

    return (
        <svg viewBox="0 0 12 16" className="w-12 h-16 sm:w-16 sm:h-[85px]" style={{ imageRendering: "pixelated" }}>
            {/* Hair */}
            <rect x="3" y="0" width="6" height="1" fill={hair} />
            <rect x="2" y="1" width="7" height="1" fill={hair} />
            {/* Head */}
            <rect x="3" y="2" width="6" height="4" fill={skin} />
            <rect x="2" y="3" width="1" height="2" fill={skin} />
            <rect x="9" y="3" width="1" height="2" fill={skin} />
            {/* Eyes */}
            {hitEye ? (
                <>
                    {/* X eyes */}
                    <rect x="4" y="3" width="1" height="1" fill={eye} />
                    <rect x="5" y="4" width="1" height="1" fill={eye} opacity="0.5" />
                    <rect x="7" y="3" width="1" height="1" fill={eye} />
                    <rect x="6" y="4" width="1" height="1" fill={eye} opacity="0.5" />
                </>
            ) : (
                <>
                    <rect x="4" y="4" width="1" height="1" fill={eye} />
                    <rect x="7" y="4" width="1" height="1" fill={eye} />
                </>
            )}
            {/* Body / Shirt */}
            <rect x="3" y="6" width="6" height="4" fill={shirt} />
            <rect x="4" y="6" width="4" height="1" fill="#7dd3fc" /> {/* collar highlight */}
            {/* Arms */}
            {armRaised ? (
                <>
                    <rect x="1" y="4" width="2" height="1" fill={shirt} />
                    <rect x="0" y="3" width="2" height="1" fill={skin} />
                    <rect x="9" y="4" width="2" height="1" fill={shirt} />
                    <rect x="10" y="3" width="2" height="1" fill={skin} />
                </>
            ) : (
                <>
                    <rect x="1" y="7" width="2" height="2" fill={shirt} />
                    <rect x="1" y="9" width="2" height="1" fill={skin} />
                    <rect x="9" y="7" width="2" height="2" fill={shirt} />
                    <rect x="9" y="9" width="2" height="1" fill={skin} />
                </>
            )}
            {/* Legs */}
            <rect x={leftLegX} y="10" width="2" height="3" fill={pants} />
            <rect x={rightLegX} y="10" width="2" height="3" fill={pants} />
            {/* Shoes */}
            <rect x={leftFootX} y="13" width="3" height="1" fill={shoe} />
            <rect x={rightFootX} y="13" width="3" height="1" fill={shoe} />
            {/* Belt */}
            <rect x="3" y="10" width="6" height="1" fill="#334155" />
        </svg>
    );
};

// --- SVG 장애물들 ---
const ObstacleSVG: React.FC<{ type: "cactus" | "rock" | "crate" | "fire" }> = ({ type }) => {
    switch (type) {
        case "cactus":
            return (
                <svg viewBox="0 0 20 28" className="w-8 h-11 sm:w-10 sm:h-14">
                    {/* Main stem */}
                    <rect x="8" y="4" width="4" height="20" rx="1" fill="#059669" />
                    <rect x="9" y="4" width="2" height="20" fill="#10b981" />
                    {/* Left branch */}
                    <rect x="3" y="10" width="5" height="3" rx="1" fill="#059669" />
                    <rect x="3" y="7" width="3" height="6" rx="1" fill="#059669" />
                    <rect x="4" y="8" width="1" height="4" fill="#10b981" />
                    {/* Right branch */}
                    <rect x="12" y="14" width="5" height="3" rx="1" fill="#059669" />
                    <rect x="14" y="11" width="3" height="6" rx="1" fill="#059669" />
                    <rect x="15" y="12" width="1" height="4" fill="#10b981" />
                    {/* Spines */}
                    <rect x="7" y="6" width="1" height="1" fill="#a7f3d0" />
                    <rect x="12" y="8" width="1" height="1" fill="#a7f3d0" />
                    <rect x="7" y="14" width="1" height="1" fill="#a7f3d0" />
                    <rect x="12" y="18" width="1" height="1" fill="#a7f3d0" />
                    {/* Pot base */}
                    <rect x="6" y="24" width="8" height="4" rx="1" fill="#92400e" />
                    <rect x="7" y="24" width="6" height="1" fill="#b45309" />
                </svg>
            );
        case "rock":
            return (
                <svg viewBox="0 0 24 20" className="w-9 h-7 sm:w-12 sm:h-9">
                    <polygon points="4,18 1,12 3,6 8,2 16,2 21,6 23,12 20,18" fill="#64748b" />
                    <polygon points="5,17 3,12 5,7 9,4 15,4 19,7 21,12 18,17" fill="#94a3b8" />
                    {/* Highlight */}
                    <polygon points="7,8 10,5 14,5 16,8 12,10" fill="#cbd5e1" opacity="0.5" />
                    {/* Crack */}
                    <line x1="10" y1="8" x2="12" y2="14" stroke="#475569" strokeWidth="0.5" />
                    <line x1="12" y1="14" x2="14" y2="12" stroke="#475569" strokeWidth="0.5" />
                </svg>
            );
        case "crate":
            return (
                <svg viewBox="0 0 20 20" className="w-8 h-8 sm:w-10 sm:h-10">
                    {/* Box body */}
                    <rect x="1" y="1" width="18" height="18" rx="1" fill="#d97706" />
                    <rect x="2" y="2" width="16" height="16" fill="#f59e0b" />
                    {/* Cross pattern */}
                    <rect x="9" y="2" width="2" height="16" fill="#b45309" />
                    <rect x="2" y="9" width="16" height="2" fill="#b45309" />
                    {/* Edges */}
                    <rect x="2" y="2" width="16" height="1" fill="#fbbf24" />
                    <rect x="2" y="2" width="1" height="16" fill="#fbbf24" />
                    {/* Corner nails */}
                    <rect x="3" y="3" width="2" height="2" rx="1" fill="#78350f" />
                    <rect x="15" y="3" width="2" height="2" rx="1" fill="#78350f" />
                    <rect x="3" y="15" width="2" height="2" rx="1" fill="#78350f" />
                    <rect x="15" y="15" width="2" height="2" rx="1" fill="#78350f" />
                </svg>
            );
        case "fire":
            return (
                <svg viewBox="0 0 20 26" className="w-8 h-10 sm:w-10 sm:h-13 animate-runner-flame">
                    {/* Outer flame */}
                    <path d="M10,1 C10,1 3,10 3,17 C3,22 6,25 10,25 C14,25 17,22 17,17 C17,10 10,1 10,1Z" fill="#f43f5e" />
                    {/* Middle flame */}
                    <path d="M10,6 C10,6 5,13 5,18 C5,21 7,23 10,23 C13,23 15,21 15,18 C15,13 10,6 10,6Z" fill="#fb923c" />
                    {/* Inner flame */}
                    <path d="M10,11 C10,11 7,15 7,18 C7,20 8,22 10,22 C12,22 13,20 13,18 C13,15 10,11 10,11Z" fill="#fbbf24" />
                    {/* Core */}
                    <ellipse cx="10" cy="20" rx="2" ry="2.5" fill="#fef3c7" />
                </svg>
            );
    }
};

// --- 별 생성 (다크모드) ---
const Stars: React.FC = () => {
    const stars = useMemo(() =>
        Array.from({ length: 10 }, (_, i) => ({
            id: i,
            left: `${5 + (i * 37 + 13) % 90}%`,
            top: `${3 + (i * 23 + 7) % 35}%`,
            size: 1 + (i % 3),
            delay: `${(i * 0.4) % 2}s`,
        })), []);

    return (
        <>
            {stars.map((s) => (
                <div
                    key={s.id}
                    className="absolute rounded-full bg-white pointer-events-none"
                    style={{
                        left: s.left,
                        top: s.top,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animation: `runnerTwinkle 2s ease-in-out ${s.delay} infinite`,
                    }}
                />
            ))}
        </>
    );
};

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
    const [inputKey, setInputKey] = useState(0);
    const [distance, setDistance] = useState(0);
    const [isInvincible, setIsInvincible] = useState(false);
    const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
    const [koreanWords, setKoreanWords] = useState<string[]>([]);

    // 새 비주얼 State
    const [runFrame, setRunFrame] = useState<0 | 1>(0);
    const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);
    const [clearParticles, setClearParticles] = useState<ClearParticle[]>([]);
    const [isShaking, setIsShaking] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);
    const [milestone, setMilestone] = useState<number | null>(null);

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const speedRef = useRef(INITIAL_SPEED);
    const obstacleIdRef = useRef(0);
    const clearedCountRef = useRef(0);
    const lastSpawnTimeRef = useRef(0);
    const invincibleRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());
    const maxSpeedRef = useRef(INITIAL_SPEED);
    const lastMilestoneRef = useRef(0);
    const clearTimeRef = useRef(0);

    const { playSound } = useGameAudio();
    usePauseHandler(gameStarted, gameOver, setIsPaused);

    // --- 달리기 프레임 토글 ---
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || charState !== "running") return;
        const interval = setInterval(() => setRunFrame((f) => (f === 0 ? 1 : 0)), 200);
        return () => clearInterval(interval);
    }, [gameStarted, gameOver, isPaused, charState]);

    // --- 점수 팝업 ---
    const showScorePopup = (text: string, x: number) => {
        const id = Date.now() + Math.random();
        setScorePopups((prev) => [...prev, { id, text, x, bottom: GROUND_BOTTOM + 8 }]);
        setTimeout(() => {
            setScorePopups((prev) => prev.filter((p) => p.id !== id));
        }, 800);
    };

    // --- 먼지 파티클 ---
    const spawnDust = () => {
        const particles: DustParticle[] = Array.from({ length: 4 }, (_, i) => ({
            id: Date.now() + i,
            dx: (Math.random() - 0.5) * 30,
        }));
        setDustParticles(particles);
        setTimeout(() => setDustParticles([]), 400);
    };

    // --- 클리어 파티클 ---
    const spawnClearParticles = (x: number, type: string) => {
        const color = OBSTACLE_CLEAR_COLORS[type] ?? "#38bdf8";
        const newParticles: ClearParticle[] = Array.from({ length: 6 }, (_, i) => ({
            id: Date.now() + i + Math.random(),
            x,
            bottom: GROUND_BOTTOM + 4,
            color,
            angle: (360 / 6) * i + (Math.random() * 30 - 15),
        }));
        setClearParticles((prev) => [...prev, ...newParticles]);
        setTimeout(() => {
            setClearParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
        }, 500);
    };

    // --- 화면 흔들림 ---
    const triggerShake = () => {
        setIsShaking(true);
        setHitFlash(true);
        setTimeout(() => setIsShaking(false), 400);
        setTimeout(() => setHitFlash(false), 300);
    };

    // --- 한국어 단어 API 로딩 ---
    const fetchKoreanWords = useCallback(async () => {
        if (language !== "korean") return;
        try {
            const starts = encodeURIComponent(pickRandomStarts(15).join(","));
            const response = await fetch(`/api/krdict/candidates?starts=${starts}&num=300`);
            if (!response.ok) return;
            const data: unknown = await response.json();
            if (
                typeof data === "object" &&
                data !== null &&
                "words" in data &&
                Array.isArray((data as { words: unknown }).words)
            ) {
                const words = ((data as { words: string[] }).words ?? [])
                    .map((w) => w.trim())
                    .filter((w) => HANGUL_WORD_REGEX.test(w));
                if (words.length > 0) {
                    setKoreanWords([...new Set(words)]);
                }
            }
        } catch {
            // ignore
        }
    }, [language]);

    useEffect(() => {
        if (language === "korean") {
            void fetchKoreanWords();
        }
    }, [language, fetchKoreanWords]);

    // --- 단어 선택 (API 단어 우선, 로컬 폴백) ---
    const getRandomWord = useCallback((): string => {
        const cleared = clearedCountRef.current;
        const maxLen = cleared < 5 ? 3 : cleared < 15 ? 4 : cleared < 30 ? 5 : 6;
        const minLen = cleared < 15 ? 2 : 3;

        if (language === "korean") {
            const pool = koreanWords.length > 0 ? koreanWords : wordsData.korean;
            if (koreanWords.length === 0) void fetchKoreanWords();
            // 순수 한글만, 길이 범위 내
            const filtered = pool.filter(
                (w) => w.length >= minLen && w.length <= maxLen && /^[\uAC00-\uD7A3]+$/.test(w)
            );
            const source = filtered.length > 0 ? filtered : pool.filter((w) => /^[\uAC00-\uD7A3]{2,}$/.test(w));
            return source.length > 0
                ? source[Math.floor(Math.random() * source.length)]
                : "타이핑";
        }

        const pool = wordsData[language];
        // 순수 영문 알파벳만
        const filtered = pool.filter(
            (w) => w.length >= minLen && w.length <= maxLen && /^[a-zA-Z]+$/.test(w)
        );
        const source = filtered.length > 0 ? filtered : pool.filter((w) => /^[a-zA-Z]+$/.test(w));
        return source.length > 0
            ? source[Math.floor(Math.random() * source.length)]
            : "typing";
    }, [language, koreanWords, fetchKoreanWords]);

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
                const now = Date.now();
                const updated = prev.map((o) => {
                    if (o.cleared) return o;
                    const newX = o.x - currentSpeed;
                    if (newX < charX - 30 && !invincibleRef.current) {
                        hitDetected = true;
                        return { ...o, x: newX, cleared: true, clearedAt: now };
                    }
                    return { ...o, x: newX };
                });

                if (hitDetected) {
                    invincibleRef.current = true;
                    setIsInvincible(true);
                    triggerShake();
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

                // 클리어된 장애물 400ms 후 제거
                return updated.filter((o) => {
                    if (o.x < -200) return false;
                    if (o.cleared && o.clearedAt && now - o.clearedAt > 400) return false;
                    return true;
                });
            });

            setDistance((d) => {
                const newD = d + currentSpeed * 0.1;
                // 마일스톤 체크
                const nextMilestone = Math.floor(newD / 500) * 500;
                if (nextMilestone > 0 && nextMilestone > lastMilestoneRef.current) {
                    lastMilestoneRef.current = nextMilestone;
                    setMilestone(nextMilestone);
                    playSound("levelUp");
                    setTimeout(() => setMilestone(null), 2000);
                }
                return newD;
            });

            const now = Date.now();
            const cleared = clearedCountRef.current;
            const spawnGap = Math.max(1200, 3000 - cleared * 80);

            if (now - lastSpawnTimeRef.current > spawnGap) {
                lastSpawnTimeRef.current = now;
                const word = getRandomWord();
                const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
                setObstacles((prev) => [
                    ...prev,
                    {
                        id: obstacleIdRef.current++,
                        x: gameWidth + 60,
                        word,
                        cleared: false,
                        type,
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
        const targetType = targetObstacle.type;

        setObstacles((prev) =>
            prev.map((o) => (o.id === targetId ? { ...o, cleared: true, clearedAt: Date.now() } : o))
        );
        clearTimeRef.current = Date.now();
        setInput("");
        setInputKey((k) => k + 1);

        clearedCountRef.current += 1;
        const wordScore = targetObstacle.word.length * 10 + Math.round(speedRef.current * 5);
        setScore((s) => s + wordScore);
        speedRef.current += SPEED_INCREMENT;
        if (speedRef.current > maxSpeedRef.current) maxSpeedRef.current = speedRef.current;

        showScorePopup(`+${wordScore}`, targetX);
        spawnClearParticles(targetX, targetType);
        spawnDust();

        setCharState("jumping");
        playSound("match");
        setTimeout(() => setCharState("running"), JUMP_DURATION);
    }, [targetObstacle, playSound]);

    const handleInput = (val: string) => {
        // 클리어 직후 150ms 내 IME ghost 이벤트 무시
        if (Date.now() - clearTimeRef.current < 150) return;
        setInput(val);
        if (targetObstacle && val === targetObstacle.word) {
            clearTarget();
        }
    };

    const handleSubmit = () => {
        if (targetObstacle && input === targetObstacle.word) {
            clearTarget();
        } else {
            clearTimeRef.current = Date.now();
            setInput("");
            setInputKey((k) => k + 1);
        }
    };

    // --- 게임오버 XP ---
    useEffect(() => {
        if (!gameOver) return;
        addXp(calculateGameXp(score / 20, difficulty));
    }, [gameOver, score, addXp, difficulty]);

    // --- 포커스 (inputKey 변경 시 리마운트 후에도 재포커스) ---
    useEffect(() => {
        if (!isPaused && !gameOver && gameStarted && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isPaused, gameOver, gameStarted, inputKey]);

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
        setDustParticles([]);
        setClearParticles([]);
        setIsShaking(false);
        setHitFlash(false);
        setMilestone(null);
        setRunFrame(0);
        speedRef.current = INITIAL_SPEED;
        obstacleIdRef.current = 0;
        clearedCountRef.current = 0;
        lastSpawnTimeRef.current = 0;
        invincibleRef.current = false;
        maxSpeedRef.current = INITIAL_SPEED;
        lastMilestoneRef.current = 0;
        setInputKey((k) => k + 1);
        setCountdown(3);
    };

    const groundAnimDuration = Math.max(0.4, 2 / (speedRef.current / INITIAL_SPEED));
    const isRunning = gameStarted && !gameOver && !isPaused;

    // 속도 퍼센트 (프로그레스 바용)
    const speedPercent = Math.min(100, ((speedRef.current - INITIAL_SPEED) / 6) * 100);

    return (
        <div
            ref={gameAreaRef}
            className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10"
        >
            <div
                className="absolute inset-0"
                style={{ background: getSkyGradient(distance, darkMode) }}
            >
                {/* ===== 하늘 장식: 해/달 + 별 ===== */}
                <div className="absolute pointer-events-none" style={{ right: "12%", top: "8%" }}>
                    {darkMode ? (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-200 shadow-[0_0_15px_rgba(226,232,240,0.4)]" />
                    ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-300 shadow-[0_0_20px_rgba(252,211,77,0.6)]" />
                    )}
                </div>
                {darkMode && <Stars />}

                {/* ===== 상단 스코어바 ===== */}
                <div
                    className={`absolute top-0 left-0 right-0 flex flex-col z-20 ${
                        darkMode ? "bg-white/[0.04] border-b border-white/[0.06]" : "bg-white/70 border-b border-sky-100/50"
                    } backdrop-blur-sm`}
                >
                    <div className="flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3">
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
                        <div className="flex gap-0.5 text-sm sm:text-lg font-bold">
                            {Array.from({ length: INITIAL_LIVES }, (_, i) => (
                                <span
                                    key={i}
                                    className={`transition-transform ${i >= lives ? "grayscale opacity-40" : ""} ${
                                        i === lives - 1 && hitFlash ? "animate-pulse" : ""
                                    }`}
                                >
                                    {i < lives ? "❤️" : "🖤"}
                                </span>
                            ))}
                        </div>
                    </div>
                    {/* 속도 인디케이터 바 */}
                    <div className={`h-0.5 ${darkMode ? "bg-white/5" : "bg-sky-100"}`}>
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
                            style={{ width: `${speedPercent}%` }}
                        />
                    </div>
                </div>

                {/* ===== 게임 스테이지 ===== */}
                <div className={`absolute inset-0 top-[52px] sm:top-[62px] bottom-12 sm:bottom-16 overflow-hidden ${isShaking ? "animate-runner-shake" : ""}`}>

                    {/* 히트 빨간 플래시 오버레이 */}
                    {hitFlash && (
                        <div className="absolute inset-0 bg-red-500/20 z-30 pointer-events-none animate-runner-hit-flash" />
                    )}

                    {/* ===== 패럴랙스 레이어 1: 먼 산 ===== */}
                    <div className="absolute bottom-[22%] left-0 pointer-events-none" style={{ width: "200%" }}>
                        <svg
                            viewBox="0 0 2400 120"
                            className={`w-full h-12 sm:h-20 ${darkMode ? "fill-slate-800/30" : "fill-emerald-200/25"}`}
                            preserveAspectRatio="none"
                            style={{
                                animation: isRunning
                                    ? `runnerParallax ${groundAnimDuration * 5}s linear infinite`
                                    : "none",
                            }}
                        >
                            <path d="M0,120 L0,80 Q100,20 200,60 Q350,10 450,50 Q550,0 700,40 Q800,10 900,45 Q1050,5 1200,55 L1200,80 Q1300,20 1400,60 Q1550,10 1650,50 Q1750,0 1900,40 Q2000,10 2100,45 Q2250,5 2400,55 L2400,120 Z" />
                        </svg>
                    </div>

                    {/* ===== 패럴랙스 레이어 2: 가까운 언덕 + 나무 ===== */}
                    <div className="absolute bottom-[22%] left-0 pointer-events-none" style={{ width: "200%" }}>
                        <svg
                            viewBox="0 0 2400 90"
                            className={`w-full h-8 sm:h-14 ${darkMode ? "fill-emerald-900/25" : "fill-emerald-300/35"}`}
                            preserveAspectRatio="none"
                            style={{
                                animation: isRunning
                                    ? `runnerParallax ${groundAnimDuration * 3}s linear infinite`
                                    : "none",
                            }}
                        >
                            <path d="M0,90 L0,60 Q80,40 160,55 Q240,30 360,50 Q480,25 600,45 Q720,35 840,50 Q960,20 1080,40 L1200,60 Q1280,40 1360,55 Q1440,30 1560,50 Q1680,25 1800,45 Q1920,35 2040,50 Q2160,20 2280,40 L2400,60 L2400,90 Z" />
                            {/* 삼각형 나무 실루엣 */}
                            <polygon points="180,55 190,25 200,55" className={darkMode ? "fill-emerald-800/40" : "fill-emerald-400/30"} />
                            <polygon points="500,45 508,18 516,45" className={darkMode ? "fill-emerald-800/40" : "fill-emerald-400/30"} />
                            <polygon points="850,50 860,20 870,50" className={darkMode ? "fill-emerald-800/40" : "fill-emerald-400/30"} />
                            <polygon points="1380,55 1390,25 1400,55" className={darkMode ? "fill-emerald-800/40" : "fill-emerald-400/30"} />
                            <polygon points="1700,45 1708,18 1716,45" className={darkMode ? "fill-emerald-800/40" : "fill-emerald-400/30"} />
                            <polygon points="2050,50 2060,20 2070,50" className={darkMode ? "fill-emerald-800/40" : "fill-emerald-400/30"} />
                        </svg>
                    </div>

                    {/* ===== 구름 (CSS div) ===== */}
                    {[
                        { top: "6%", right: "10%", w: "60px", h: "20px", opacity: darkMode ? 0.08 : 0.25, speed: "slow" },
                        { top: "12%", right: "35%", w: "80px", h: "24px", opacity: darkMode ? 0.06 : 0.2, speed: "fast" },
                        { top: "8%", right: "60%", w: "50px", h: "16px", opacity: darkMode ? 0.04 : 0.15, speed: "slow" },
                        { top: "15%", right: "80%", w: "70px", h: "20px", opacity: darkMode ? 0.05 : 0.18, speed: "fast" },
                        { top: "4%", right: "50%", w: "45px", h: "14px", opacity: darkMode ? 0.03 : 0.12, speed: "slow" },
                    ].map((cloud, i) => (
                        <div
                            key={i}
                            className={`absolute rounded-full pointer-events-none ${darkMode ? "bg-slate-400" : "bg-white"} ${
                                isRunning
                                    ? cloud.speed === "slow" ? "animate-runner-cloud-slow" : "animate-runner-cloud"
                                    : ""
                            }`}
                            style={{
                                top: cloud.top,
                                right: cloud.right,
                                width: cloud.w,
                                height: cloud.h,
                                opacity: cloud.opacity,
                            }}
                        />
                    ))}

                    {/* ===== 지면 - 다층 구조 ===== */}
                    <div className="absolute bottom-0 left-0 right-0" style={{ height: `${GROUND_BOTTOM}%` }}>
                        {/* SVG 톱니 잔디 */}
                        <div className="absolute -top-2 left-0 pointer-events-none" style={{ width: "200%" }}>
                            <svg
                                viewBox="0 0 2400 16"
                                className={`w-full h-3 sm:h-4 ${darkMode ? "fill-emerald-600/50" : "fill-emerald-500/70"}`}
                                preserveAspectRatio="none"
                                style={{
                                    animation: isRunning
                                        ? `runnerParallax ${groundAnimDuration}s linear infinite`
                                        : "none",
                                }}
                            >
                                {/* Zigzag grass pattern */}
                                <path d={Array.from({ length: 120 }, (_, i) => {
                                    const x = i * 20;
                                    const tipY = 2 + (i % 3) * 2;
                                    return `${i === 0 ? "M" : "L"}${x},16 L${x + 10},${tipY} L${x + 20},16`;
                                }).join(" ") + " L2400,16 Z"} />
                            </svg>
                        </div>
                        {/* 잔디 라인 */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 ${darkMode ? "bg-emerald-500/40" : "bg-emerald-500/60"}`} />
                        {/* 흙 레이어 */}
                        <div
                            className={`absolute inset-0 top-1.5 sm:top-2 ${darkMode ? "bg-[#1a2a1a]" : "bg-gradient-to-b from-emerald-200/70 to-amber-100/50"}`}
                            style={{
                                backgroundImage: darkMode
                                    ? "repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(255,255,255,0.02) 38px, rgba(255,255,255,0.02) 40px), repeating-linear-gradient(180deg, transparent, transparent 8px, rgba(255,255,255,0.01) 8px, rgba(255,255,255,0.01) 10px)"
                                    : "repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(0,0,0,0.03) 38px, rgba(0,0,0,0.03) 40px), repeating-linear-gradient(180deg, transparent, transparent 8px, rgba(0,0,0,0.02) 8px, rgba(0,0,0,0.02) 10px)",
                                backgroundSize: "40px 10px",
                                animation: isRunning
                                    ? `runnerGround ${groundAnimDuration}s linear infinite`
                                    : "none",
                            }}
                        >
                            {/* 지면 장식: 꽃, 돌 */}
                            <div className="absolute top-1 left-[10%] w-1.5 h-1.5 rounded-full bg-rose-400/40" />
                            <div className="absolute top-2 left-[30%] w-1 h-1 rounded-full bg-amber-400/30" />
                            <div className={`absolute top-1 left-[55%] w-2 h-1 rounded-sm ${darkMode ? "bg-slate-600/20" : "bg-slate-400/20"}`} />
                            <div className="absolute top-2 left-[75%] w-1.5 h-1.5 rounded-full bg-rose-300/30" />
                            <div className={`absolute top-1 left-[90%] w-1.5 h-1 rounded-sm ${darkMode ? "bg-slate-600/15" : "bg-slate-400/15"}`} />
                        </div>
                    </div>

                    {/* ===== 캐릭터 ===== */}
                    <div
                        className={`absolute z-10 select-none ${
                            charState === "jumping"
                                ? "animate-runner-jump"
                                : charState === "hit"
                                ? "animate-runner-hit"
                                : isRunning
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
                        {/* 픽셀아트 캐릭터 */}
                        <PixelCharacter state={charState} frame={runFrame} />
                    </div>

                    {/* 점프 먼지 파티클 */}
                    {dustParticles.map((p) => (
                        <div
                            key={p.id}
                            className="absolute pointer-events-none animate-runner-dust"
                            style={{
                                left: `${CHAR_X_PERCENT}%`,
                                bottom: `${GROUND_BOTTOM}%`,
                                ["--dx" as string]: `${p.dx}px`,
                                width: "4px",
                                height: "4px",
                                borderRadius: "50%",
                                backgroundColor: darkMode ? "rgba(180,180,150,0.5)" : "rgba(120,100,60,0.4)",
                            }}
                        />
                    ))}

                    {/* ===== 장애물들 ===== */}
                    {obstacles.map((o) => {
                        const isTarget = targetObstacle?.id === o.id;
                        const isClearing = o.cleared && o.clearedAt;

                        return (
                            <div
                                key={o.id}
                                className={`absolute select-none ${!o.cleared ? "animate-word-spawn" : ""} ${
                                    isClearing ? "animate-runner-obstacle-clear" : ""
                                }`}
                                style={{
                                    left: `${o.x}px`,
                                    bottom: `${GROUND_BOTTOM}%`,
                                }}
                            >
                                {/* 단어 라벨 */}
                                {!o.cleared && (
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
                                        }`}
                                            style={isTarget ? {
                                                boxShadow: darkMode
                                                    ? "0 0 12px rgba(56,189,248,0.15)"
                                                    : "0 0 12px rgba(56,189,248,0.1)",
                                            } : undefined}
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
                                                    {/* 타이핑 커서 */}
                                                    <span className="animate-pulse text-sky-400">|</span>
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
                                )}

                                {/* 장애물 SVG 본체 */}
                                <div className="relative flex items-end justify-center">
                                    <ObstacleSVG type={o.type} />
                                    {/* 장애물 그림자 */}
                                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-[80%] h-1 rounded-full ${
                                        darkMode ? "bg-black/20" : "bg-black/10"
                                    }`} />
                                </div>
                            </div>
                        );
                    })}

                    {/* 클리어 파티클 */}
                    {clearParticles.map((p) => (
                        <div
                            key={p.id}
                            className="absolute pointer-events-none animate-particle-burst"
                            style={{
                                left: `${p.x}px`,
                                bottom: `${p.bottom}%`,
                                ["--angle" as string]: `${p.angle}deg`,
                                backgroundColor: p.color,
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                            }}
                        />
                    ))}

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

                    {/* 마일스톤 토스트 */}
                    {milestone !== null && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                            <div className="animate-level-up text-3xl sm:text-5xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]"
                                style={{ position: "absolute", top: "50%", left: "50%" }}
                            >
                                {milestone}m!
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== 입력 영역 ===== */}
                <div
                    className={`absolute bottom-0 left-0 right-0 p-2 sm:p-3 backdrop-blur-sm border-t ${
                        darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                    }`}
                >
                    <GameInput
                        key={inputKey}
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
                        {/* 시작 화면 캐릭터 */}
                        <div className="flex justify-center mb-3">
                            <PixelCharacter state="running" frame={0} />
                        </div>
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
