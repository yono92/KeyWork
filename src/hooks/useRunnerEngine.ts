import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import { useGameAudio } from "./useGameAudio";
import { usePauseHandler } from "./usePauseHandler";
import { useKoreanWords } from "./useKoreanWords";

const CHAR_X_PERCENT = 15;
const INITIAL_SPEED = 2;
const SPEED_INCREMENT = 0.1;
const INITIAL_LIVES = 3;
const JUMP_DURATION = 650;
const HIT_DURATION = 500;
const HIT_INVINCIBILITY = 1200;

const OBSTACLE_TYPES: Array<"cactus" | "rock" | "crate" | "fire"> = ["cactus", "rock", "crate", "fire"];

const OBSTACLE_CLEAR_COLORS: Record<string, string> = {
    cactus: "#34d399",
    rock: "#94a3b8",
    crate: "#fbbf24",
    fire: "#fb923c",
};

export interface Obstacle {
    id: number;
    x: number;
    word: string;
    cleared: boolean;
    clearedAt?: number;
    type: "cactus" | "rock" | "crate" | "fire";
}

export interface RunnerCallbacks {
    onHit: () => void;
    onClear: (x: number, type: string, wordScore: number) => void;
    onMilestone: (distance: number) => void;
    onGameOver: () => void;
}

export { CHAR_X_PERCENT, INITIAL_SPEED, INITIAL_LIVES, OBSTACLE_CLEAR_COLORS };

/**
 * TypingRunner 게임 엔진 — 16ms 게임루프, 장애물 스포닝, 충돌, 입력, 마일스톤
 */
export function useRunnerEngine(callbacks: RunnerCallbacks) {
    const language = useTypingStore((s) => s.language);

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
    const [runFrame, setRunFrame] = useState<0 | 1>(0);
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
    const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    // 단어 길이 필터: 진행도에 따라 제한
    const wordFilter = useCallback((w: string): boolean => {
        const cleared = clearedCountRef.current;
        const maxLen = cleared < 5 ? 3 : cleared < 15 ? 4 : cleared < 30 ? 5 : 6;
        const minLen = cleared < 15 ? 2 : 3;
        if (language === "korean") {
            return w.length >= minLen && w.length <= maxLen && /^[\uAC00-\uD7A3]+$/.test(w);
        }
        return w.length >= minLen && w.length <= maxLen && /^[a-zA-Z]+$/.test(w);
    }, [language]);

    const { getRandomWord, fetchKoreanWords } = useKoreanWords(language, { wordFilter });

    const { playSound } = useGameAudio();
    usePauseHandler(gameStarted, gameOver, setIsPaused);

    // 달리기 프레임 토글
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || charState !== "running") return;
        const interval = setInterval(() => setRunFrame((f) => (f === 0 ? 1 : 0)), 200);
        return () => clearInterval(interval);
    }, [gameStarted, gameOver, isPaused, charState]);

    // 카운트다운
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

    // 타겟 장애물
    const targetObstacle = useMemo(() => {
        return obstacles
            .filter((o) => !o.cleared)
            .sort((a, b) => a.x - b.x)[0] ?? null;
    }, [obstacles]);

    // 게임 루프
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
                    callbacksRef.current.onHit();
                    const t1 = setTimeout(() => {
                        invincibleRef.current = false;
                        setIsInvincible(false);
                    }, HIT_INVINCIBILITY);
                    animTimersRef.current.push(t1);
                    playSound("lifeLost");
                    setCharState("hit");
                    const t2 = setTimeout(() => setCharState("running"), HIT_DURATION);
                    animTimersRef.current.push(t2);
                    setLives((l) => {
                        const newL = Math.max(l - 1, 0);
                        if (newL <= 0) {
                            setGameOver(true);
                            playSound("gameOver");
                            callbacksRef.current.onGameOver();
                        }
                        return newL;
                    });
                }

                return updated.filter((o) => {
                    if (o.x < -200) return false;
                    if (o.cleared && o.clearedAt && now - o.clearedAt > 400) return false;
                    return true;
                });
            });

            setDistance((d) => {
                const newD = d + currentSpeed * 0.1;
                const nextMilestone = Math.floor(newD / 500) * 500;
                if (nextMilestone > 0 && nextMilestone > lastMilestoneRef.current) {
                    lastMilestoneRef.current = nextMilestone;
                    setMilestone(nextMilestone);
                    playSound("win");
                    callbacksRef.current.onMilestone(nextMilestone);
                    const t3 = setTimeout(() => setMilestone(null), 2000);
                    animTimersRef.current.push(t3);
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

        return () => {
            clearInterval(gameLoop);
            animTimersRef.current.forEach(clearTimeout);
            animTimersRef.current = [];
        };
    }, [gameStarted, gameOver, isPaused, playSound, getRandomWord]);

    // 단어 매칭
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

        callbacksRef.current.onClear(targetX, targetType, wordScore);

        setCharState("jumping");
        playSound("match");
        const t4 = setTimeout(() => setCharState("running"), JUMP_DURATION);
        animTimersRef.current.push(t4);
    }, [targetObstacle, playSound]);

    const handleInput = useCallback((val: string) => {
        if (Date.now() - clearTimeRef.current < 150) return;
        setInput(val);
        if (targetObstacle && val === targetObstacle.word) {
            clearTarget();
        }
    }, [targetObstacle, clearTarget]);

    const handleSubmit = useCallback(() => {
        if (targetObstacle && input === targetObstacle.word) {
            clearTarget();
        } else {
            clearTimeRef.current = Date.now();
            setInput("");
            setInputKey((k) => k + 1);
        }
    }, [targetObstacle, input, clearTarget]);

    // 포커스
    useEffect(() => {
        if (!isPaused && !gameOver && gameStarted && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isPaused, gameOver, gameStarted, inputKey]);

    const restartGame = useCallback(() => {
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
        setMilestone(null);
        setRunFrame(0);
        speedRef.current = INITIAL_SPEED;
        obstacleIdRef.current = 0;
        clearedCountRef.current = 0;
        lastSpawnTimeRef.current = 0;
        invincibleRef.current = false;
        maxSpeedRef.current = INITIAL_SPEED;
        lastMilestoneRef.current = 0;
        animTimersRef.current.forEach(clearTimeout);
        animTimersRef.current = [];
        setInputKey((k) => k + 1);
        setCountdown(3);
    }, []);

    const groundAnimDuration = Math.max(0.4, 2 / (speedRef.current / INITIAL_SPEED));
    const isRunning = gameStarted && !gameOver && !isPaused;
    const speedPercent = Math.min(100, ((speedRef.current - INITIAL_SPEED) / 6) * 100);

    return {
        // State
        gameStarted,
        gameOver,
        isPaused,
        countdown,
        score,
        lives,
        obstacles,
        charState,
        input,
        inputKey,
        distance,
        isInvincible,
        runFrame,
        milestone,
        targetObstacle,
        isRunning,
        groundAnimDuration,
        speedPercent,
        // Refs
        gameAreaRef,
        inputRef,
        speedRef,
        clearedCountRef,
        gameStartTimeRef,
        maxSpeedRef,
        // Actions
        handleInput,
        handleSubmit,
        restartGame,
        fetchKoreanWords,
    };
}
