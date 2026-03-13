"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useKoreanWords } from "./useKoreanWords";
import { getRandomSentence } from "../utils/sentenceUtils";

// ── 타입 ──

export type EnemyType = "normal" | "fast" | "tank" | "boss";
export type EnemyStatus = "marching" | "targeted" | "dying" | "reached";
type Difficulty = "easy" | "normal" | "hard";
type GamePhase = "idle" | "countdown" | "playing" | "waveBreak" | "gameOver";

export interface Enemy {
    id: number;
    word: string;
    type: EnemyType;
    x: number; // 0(기지)~100(스폰)
    speed: number; // %/frame (60fps 기준)
    hp: number;
    maxHp: number;
    status: EnemyStatus;
    matchedChars: number; // 부분 매칭된 글자 수
}

export interface DefenseStats {
    score: number;
    wave: number;
    lives: number;
    maxLives: number;
    combo: number;
    maxCombo: number;
    kills: number;
    bossKills: number;
    phase: GamePhase;
    countdown: number;
    waveBreakTimer: number;
}

interface DifficultyConfig {
    speedMul: number;
    spawnMul: number;
    lives: number;
    scoreMul: number;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
    easy: { speedMul: 0.6, spawnMul: 1.5, lives: 5, scoreMul: 0.7 },
    normal: { speedMul: 1.0, spawnMul: 1.0, lives: 3, scoreMul: 1.0 },
    hard: { speedMul: 1.4, spawnMul: 0.7, lives: 2, scoreMul: 1.5 },
};

// 적 타입별 설정
const ENEMY_CONFIG: Record<EnemyType, {
    wordLenMin: number;
    wordLenMax: number;
    speedBase: number;
    scoreMul: number;
}> = {
    normal: { wordLenMin: 2, wordLenMax: 4, speedBase: 0.04, scoreMul: 1.0 },
    fast: { wordLenMin: 1, wordLenMax: 2, speedBase: 0.07, scoreMul: 1.2 },
    tank: { wordLenMin: 4, wordLenMax: 6, speedBase: 0.02, scoreMul: 1.5 },
    boss: { wordLenMin: 6, wordLenMax: 20, speedBase: 0.015, scoreMul: 5.0 },
};

const WAVE_BREAK_DURATION = 3; // 초
const BASE_SPAWN_INTERVAL = 2000; // ms
const BOSS_EVERY = 5;

// ── 웨이브 생성 (순수 함수) ──

function generateWaveQueue(waveNum: number): EnemyType[] {
    const isBoss = waveNum % BOSS_EVERY === 0;
    const baseCount = Math.min(5 + waveNum * 2, 20);

    const queue: EnemyType[] = [];
    const normalCount = Math.floor(baseCount * 0.6);
    const fastCount = Math.floor(baseCount * 0.25);
    const tankCount = baseCount - normalCount - fastCount;

    for (let i = 0; i < normalCount; i++) queue.push("normal");
    for (let i = 0; i < fastCount; i++) queue.push("fast");
    for (let i = 0; i < tankCount; i++) queue.push("tank");

    // 셔플
    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    if (isBoss) queue.push("boss");
    return queue;
}

// ── 훅 ──

export function useDefenseEngine(language: "korean" | "english") {
    // 게임 상태
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [phase, setPhase] = useState<GamePhase>("idle");
    const [score, setScore] = useState(0);
    const [wave, setWave] = useState(1);
    const [lives, setLives] = useState(3);
    const [combo, setCombo] = useState(0);
    const [countdown, setCountdown] = useState(3);
    const [waveBreakTimer, setWaveBreakTimer] = useState(WAVE_BREAK_DURATION);
    const [isPaused, setIsPaused] = useState(false);

    // refs — 콜백 안정성을 위해 모든 변화하는 값을 ref로 관리
    const difficultyRef = useRef<Difficulty>("normal");
    const maxLivesRef = useRef(3);
    const maxComboRef = useRef(0);
    const killsRef = useRef(0);
    const bossKillsRef = useRef(0);
    const nextIdRef = useRef(0);
    const waveEnemyQueue = useRef<EnemyType[]>([]);
    const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const frameRef = useRef<number>(0);
    const lastFrameRef = useRef(0);
    const phaseRef = useRef<GamePhase>("idle");
    const pausedRef = useRef(false);
    const comboRef = useRef(0);
    const languageRef = useRef(language);

    // 단어 풀
    const { getRandomWord } = useKoreanWords(language, {
        wordFilter: (w) => w.length >= 1 && w.length <= 6,
    });
    const getRandomWordRef = useRef(getRandomWord);

    // ref 동기화
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { comboRef.current = combo; }, [combo]);
    useEffect(() => { languageRef.current = language; }, [language]);
    useEffect(() => { getRandomWordRef.current = getRandomWord; }, [getRandomWord]);

    // ── 적 단어 생성 (ref 기반) ──
    const getEnemyWord = useCallback((type: EnemyType): string => {
        if (type === "boss") {
            return getRandomSentence(languageRef.current);
        }
        const config = ENEMY_CONFIG[type];
        for (let i = 0; i < 10; i++) {
            const word = getRandomWordRef.current();
            if (word.length >= config.wordLenMin && word.length <= config.wordLenMax) {
                return word;
            }
        }
        return getRandomWordRef.current();
    }, []); // 안정적인 의존성 — ref만 사용

    // ── 적 생성 (ref 기반) ──
    const spawnEnemy = useCallback((type: EnemyType) => {
        const config = ENEMY_CONFIG[type];
        const diff = DIFFICULTY_CONFIG[difficultyRef.current];
        const word = getEnemyWord(type);
        const id = nextIdRef.current++;

        const enemy: Enemy = {
            id,
            word,
            type,
            x: 100,
            speed: config.speedBase * diff.speedMul,
            hp: 1,
            maxHp: 1,
            status: "marching",
            matchedChars: 0,
        };

        setEnemies((prev) => [...prev, enemy]);
    }, [getEnemyWord]); // getEnemyWord는 [] 의존성이므로 안정적

    // ── 스폰 루프 시작 ──
    const startSpawnLoop = useCallback((waveNum: number) => {
        if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);

        const queue = generateWaveQueue(waveNum);
        waveEnemyQueue.current = [...queue];

        const diff = DIFFICULTY_CONFIG[difficultyRef.current];
        const interval = BASE_SPAWN_INTERVAL * diff.spawnMul * Math.max(0.5, 1 - (waveNum - 1) * 0.03);

        // 첫 적은 즉시 스폰
        const first = waveEnemyQueue.current.shift();
        if (first) spawnEnemy(first);

        spawnTimerRef.current = setInterval(() => {
            if (pausedRef.current) return;
            if (phaseRef.current !== "playing") return;

            const next = waveEnemyQueue.current.shift();
            if (next) {
                spawnEnemy(next);
            } else {
                if (spawnTimerRef.current) {
                    clearInterval(spawnTimerRef.current);
                    spawnTimerRef.current = null;
                }
            }
        }, interval);
    }, [spawnEnemy]); // spawnEnemy는 안정적

    // ── 이동 루프 (requestAnimationFrame) ──
    useEffect(() => {
        if (phase !== "playing") return;

        const tick = (timestamp: number) => {
            if (pausedRef.current) {
                lastFrameRef.current = timestamp;
                frameRef.current = requestAnimationFrame(tick);
                return;
            }

            if (lastFrameRef.current === 0) lastFrameRef.current = timestamp;
            const delta = timestamp - lastFrameRef.current;
            lastFrameRef.current = timestamp;
            const factor = Math.min(delta / 16, 3);

            setEnemies((prev) => {
                let livesLost = 0;
                const updated = prev.map((enemy) => {
                    if (enemy.status === "dying" || enemy.status === "reached") return enemy;

                    const newX = enemy.x - enemy.speed * factor;
                    if (newX <= 2) {
                        livesLost++;
                        return { ...enemy, x: 0, status: "reached" as const };
                    }
                    return { ...enemy, x: newX };
                });

                if (livesLost > 0) {
                    setLives((prev) => {
                        const newLives = Math.max(0, prev - livesLost);
                        if (newLives <= 0) {
                            setPhase("gameOver");
                        }
                        return newLives;
                    });
                    setCombo(0);
                }

                return updated;
            });

            frameRef.current = requestAnimationFrame(tick);
        };

        lastFrameRef.current = 0;
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [phase]);

    // ── 죽은/도달 적 정리 ──
    useEffect(() => {
        const deadOrReached = enemies.filter(
            (e) => e.status === "dying" || e.status === "reached"
        );
        if (deadOrReached.length === 0) return;

        const timer = setTimeout(() => {
            setEnemies((prev) =>
                prev.filter((e) => e.status !== "dying" && e.status !== "reached")
            );
        }, 400);
        return () => clearTimeout(timer);
    }, [enemies]);

    // ── 웨이브 클리어 감지 ──
    useEffect(() => {
        if (phase !== "playing") return;
        if (waveEnemyQueue.current.length > 0) return;
        if (spawnTimerRef.current) return;

        const alive = enemies.filter(
            (e) => e.status === "marching" || e.status === "targeted"
        );
        if (alive.length === 0 && enemies.length > 0) {
            const diff = DIFFICULTY_CONFIG[difficultyRef.current];
            const waveBonus = Math.round(wave * 100 * diff.scoreMul);
            setScore((prev) => prev + waveBonus);
            setPhase("waveBreak");
            setWaveBreakTimer(WAVE_BREAK_DURATION);
        }
    }, [enemies, phase, wave]);

    // ── 웨이브 브레이크 타이머 ──
    useEffect(() => {
        if (phase !== "waveBreak") return;

        const timer = setInterval(() => {
            if (pausedRef.current) return;
            setWaveBreakTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setWave((w) => w + 1);
                    setPhase("playing");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase]);

    // ── 새 웨이브 시작 시 스폰 (안정적 의존성) ──
    useEffect(() => {
        if (phase === "playing") {
            startSpawnLoop(wave);
        }
        return () => {
            if (spawnTimerRef.current) {
                clearInterval(spawnTimerRef.current);
                spawnTimerRef.current = null;
            }
        };
    }, [phase, wave, startSpawnLoop]);

    // ── 타이핑 매칭 ──
    const tryMatch = useCallback((input: string): {
        matched: boolean;
        enemy?: Enemy;
        isPartial?: boolean;
    } => {
        if (!input.trim()) return { matched: false };

        const trimmed = input.trim();

        setEnemies((prev) => {
            return prev.map((enemy) => {
                if (enemy.status !== "marching" && enemy.status !== "targeted") return enemy;
                if (enemy.word.startsWith(trimmed)) {
                    return { ...enemy, status: "targeted" as const, matchedChars: trimmed.length };
                }
                return { ...enemy, status: "marching" as const, matchedChars: 0 };
            });
        });

        // 완전 매칭 확인 — enemies snapshot 사용
        const alive = enemies.filter(
            (e) => (e.status === "marching" || e.status === "targeted") && e.word === trimmed
        );

        if (alive.length === 0) {
            const partial = enemies.some(
                (e) => (e.status === "marching" || e.status === "targeted") && e.word.startsWith(trimmed)
            );
            return { matched: false, isPartial: partial };
        }

        const target = alive.reduce((a, b) => (a.x < b.x ? a : b));
        return { matched: true, enemy: target };
    }, [enemies]);

    const killEnemy = useCallback((enemy: Enemy) => {
        const diff = DIFFICULTY_CONFIG[difficultyRef.current];
        const config = ENEMY_CONFIG[enemy.type];

        const newCombo = comboRef.current + 1;
        if (newCombo > maxComboRef.current) maxComboRef.current = newCombo;
        setCombo(newCombo);

        const comboMultiplier = Math.min(1 + newCombo * 0.2, 3.0);
        const baseScore = enemy.word.length * 10;
        const finalScore = Math.round(baseScore * config.scoreMul * comboMultiplier * diff.scoreMul);
        setScore((prev) => prev + finalScore);

        killsRef.current++;
        if (enemy.type === "boss") bossKillsRef.current++;

        setEnemies((prev) =>
            prev.map((e) =>
                e.id === enemy.id ? { ...e, status: "dying" as const } : e
            )
        );

        return { score: finalScore, combo: newCombo };
    }, []);

    // ── 게임 시작 ──
    const startGame = useCallback((difficulty: Difficulty) => {
        difficultyRef.current = difficulty;
        const config = DIFFICULTY_CONFIG[difficulty];

        setEnemies([]);
        setScore(0);
        setWave(1);
        setLives(config.lives);
        maxLivesRef.current = config.lives;
        setCombo(0);
        maxComboRef.current = 0;
        killsRef.current = 0;
        bossKillsRef.current = 0;
        nextIdRef.current = 0;
        waveEnemyQueue.current = [];
        setIsPaused(false);

        setCountdown(3);
        setPhase("countdown");

        let count = 3;
        const timer = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(timer);
                setPhase("playing");
            }
        }, 1000);
    }, []);

    const restart = useCallback(() => {
        startGame(difficultyRef.current);
    }, [startGame]);

    const backToMenu = useCallback(() => {
        if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        setEnemies([]);
        setPhase("idle");
    }, []);

    const togglePause = useCallback(() => {
        if (phaseRef.current !== "playing" && phaseRef.current !== "waveBreak") return;
        setIsPaused((prev) => !prev);
    }, []);

    // ESC
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") togglePause();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [togglePause]);

    const stats: DefenseStats = {
        score,
        wave,
        lives,
        maxLives: maxLivesRef.current,
        combo,
        maxCombo: maxComboRef.current,
        kills: killsRef.current,
        bossKills: bossKillsRef.current,
        phase,
        countdown,
        waveBreakTimer,
    };

    return {
        enemies,
        stats,
        isPaused,
        startGame,
        restart,
        backToMenu,
        tryMatch,
        killEnemy,
        togglePause,
    };
}
