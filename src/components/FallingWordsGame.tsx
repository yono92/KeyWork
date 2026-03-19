import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import { decomposeHangul } from "../utils/hangulUtils";
import { formatPlayTime } from "../utils/formatting";
import { useGameAudio } from "../hooks/useGameAudio";
import { usePauseHandler } from "../hooks/usePauseHandler";
import { useKoreanWords } from "../hooks/useKoreanWords";
import { usePowerUpSystem } from "../hooks/usePowerUpSystem";
import {
    calculateFallingWordsMatchScore,
    findClaimableFallingWord,
} from "@/lib/fallingWords";
import PauseOverlay from "./game/PauseOverlay";
import GameOverModal from "./game/GameOverModal";
import GameInput from "./game/GameInput";
import { Button } from "@/components/ui/button";
import FallbackNotice from "./game/FallbackNotice";


interface Word {
    id: number;
    text: string;
    left: number;
    top: number;
    type: "normal" | "life" | "slow" | "clear" | "shield" | "score" | "golden";
    color?: string;
    status: "falling" | "matched" | "missed";
    floatDelay: number;
}

interface ScorePopup {
    id: number;
    text: string;
    left: number;
    top: number;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    char: string;
    dx: number;
    dy: number;
}

interface MultiKillText {
    id: number;
    text: string;
    x: number;
    y: number;
}

const ITEM_TYPES = {
    life: { chance: 0.03, color: "text-red-400" },
    slow: { chance: 0.03, color: "text-blue-400" },
    clear: { chance: 0.02, color: "text-purple-400" },
    shield: { chance: 0.02, color: "text-yellow-400" },
    score: { chance: 0.05, color: "text-green-400" },
} as const;

const DIFFICULTY_CONFIG = {
    easy:   { spawnMul: 1.5, speedMul: 0.7, lives: 3, scorePerLevel: 400 },
    normal: { spawnMul: 1.0, speedMul: 1.0, lives: 3, scorePerLevel: 500 },
    hard:   { spawnMul: 0.7, speedMul: 1.3, lives: 3, scorePerLevel: 600 },
} as const;

const FallingWordsGame: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const retroTheme = useTypingStore((state) => state.retroTheme);
    const language = useTypingStore((state) => state.language);
    const highScore = useTypingStore((state) => state.highScore);
    const setHighScore = useTypingStore((state) => state.setHighScore);
    const difficulty = useTypingStore((state) => state.difficulty);

    const config = DIFFICULTY_CONFIG[difficulty];

    const [words, setWords] = useState<Word[]>([]);
    const [input, setInput] = useState<string>("");
    const [score, setScore] = useState<number>(0);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [level, setLevel] = useState<number>(1);
    const [lives, setLives] = useState<number>(DIFFICULTY_CONFIG[difficulty].lives);
    const [levelUp, setLevelUp] = useState<boolean>(false);
    const [combo, setCombo] = useState<number>(0);
    const [lastTypedTime, setLastTypedTime] = useState<number>(0);
    const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [comboGlow, setComboGlow] = useState(false);
    const [lifeLostShake, setLifeLostShake] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [multiKills, setMultiKills] = useState<MultiKillText[]>([]);
    const [inputRipple, setInputRipple] = useState(false);
    const lastMatchTimeRef = useRef(0);
    const rapidMatchCountRef = useRef(0);

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const comboRef = useRef(0);
    const claimedWordIdsRef = useRef<Set<number>>(new Set());
    const wordIdCounterRef = useRef(0);

    // 게임 통계 refs
    const totalWordsTypedRef = useRef(0);
    const maxComboRef = useRef(0);
    const gameStartTimeRef = useRef(Date.now());
    const itemsCollectedRef = useRef(0);

    const { getRandomWord, koreanWords, fetchKoreanWords, fallbackMessage } =
        useKoreanWords(language, { trackFallback: true });

    const { slowMotion, shield, activeEffects, applyEffect, resetEffects } = usePowerUpSystem();

    // 항상 1개씩 스폰, 레벨이 오르면 스폰 간격이 줄고 낙하 속도가 빨라짐
    // 화면 동시 단어 수 ≈ fallSeconds / (spawnInterval/1000)
    // Lv1: 7.5s / 2.8s ≈ 2.7개, Lv5: 4.5s / 1.6s ≈ 2.8개, Lv10: 2.5s / 0.85s ≈ 2.9개
    const baseSpawn = Math.max(2800 - (level - 1) * 200, 600); // Lv1: 2800ms → Lv12: 600ms (floor)
    const spawnInterval = baseSpawn * (slowMotion ? 1.5 : 1) * config.spawnMul;

    const baseFall = Math.max(7.5 - (level - 1) * 0.5, 2.0); // Lv1: 7.5s → Lv12: 2.0s (floor)
    const fallSeconds = baseFall * (slowMotion ? 2 : 1) / config.speedMul;

    const lifeLostRef = useRef(false);

    const { playSound } = useGameAudio();
    usePauseHandler(gameStarted, gameOver, setIsPaused);

    useEffect(() => {
        comboRef.current = combo;
    }, [combo]);

    // 카운트다운 타이머
    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            setCountdown(null);
            setGameStarted(true);
            gameStartTimeRef.current = Date.now();
            playSound("crtOn");
            if (inputRef.current) inputRef.current.focus();
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, playSound]);

    const showScorePopup = (text: string, left: number, top: number) => {
        const id = Date.now() + Math.random();
        setScorePopups((prev) => [...prev, { id, text, left, top }]);
        setTimeout(() => {
            setScorePopups((prev) => prev.filter((p) => p.id !== id));
        }, 800);
    };

    const spawnParticles = useCallback((text: string, left: number, top: number) => {
        const chars = text.split("");
        const newParticles: Particle[] = chars.map((char, i) => ({
            id: Date.now() + Math.random() + i,
            x: left + i * 14,
            y: top,
            char,
            dx: (Math.random() - 0.5) * 120,
            dy: (Math.random() - 0.8) * 80,
        }));
        setParticles((prev) => [...prev, ...newParticles]);
        setTimeout(() => {
            setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
        }, 600);
    }, []);

    const showMultiKill = useCallback((count: number, x: number, y: number) => {
        const labels = ["", "", "DOUBLE!", "TRIPLE!", "ULTRA!", "INSANE!"];
        const text = labels[Math.min(count, 5)] || `${count}x KILL!`;
        const id = Date.now() + Math.random();
        setMultiKills((prev) => [...prev, { id, text, x, y }]);
        setTimeout(() => setMultiKills((prev) => prev.filter((mk) => mk.id !== id)), 1200);
    }, []);

    const spawnWord = useCallback((): void => {
        if (gameOver || isPaused) return;

        const gameArea = gameAreaRef.current;
        const maxLeft = gameArea ? gameArea.offsetWidth - 120 : 0;

        // 항상 1개씩 스폰 — 난이도는 스폰 간격 + 낙하 속도로 조절
        const numWords = 1;
        for (let i = 0; i < numWords; i++) {
            const wordText = getRandomWord();
            if (!wordText) continue;

            let wordType: Word["type"] = "normal";
            const random = Math.random();

            // 골든 워드: 4% 확률 (레벨 3+)
            if (level >= 3 && random < 0.04) {
                wordType = "golden";
            } else {
                const itemChance = Math.min(0.05 + (level - 1) * 0.01, 0.2);
                if (random < itemChance + 0.04) {
                    const itemTypes: Word["type"][] = [
                        "life",
                        "slow",
                        "clear",
                        "shield",
                        "score",
                    ];
                    wordType =
                        itemTypes[Math.floor(Math.random() * itemTypes.length)];
                }
            }

            let newLeft = Math.random() * maxLeft + 10;
            setWords((curr) => {
                const MIN_GAP = 90;
                let attempts = 0;
                while (attempts < 10) {
                    const overlaps = curr.some(
                        (w) => w.top < 60 && Math.abs(w.left - newLeft) < MIN_GAP
                    );
                    if (!overlaps) break;
                    newLeft = Math.random() * maxLeft + 10;
                    attempts++;
                }

                const newWord: Word = {
                    id: ++wordIdCounterRef.current,
                    text: wordText,
                    left: newLeft,
                    top: -40,
                    type: wordType,
                    color:
                        wordType === "golden"
                            ? "text-yellow-400"
                            : wordType !== "normal"
                            ? ITEM_TYPES[wordType as keyof typeof ITEM_TYPES].color
                            : undefined,
                    status: "falling",
                    floatDelay: Math.random() * 3,
                };
                return [...curr, newWord];
            });
        }
    }, [gameOver, isPaused, level, getRandomWord]);

    const getItemEmoji = (type: Word["type"]) => {
        switch (type) {
            case "life":
                return "❤️";
            case "slow":
                return "🐌";
            case "clear":
                return "💫";
            case "shield":
                return "🛡️";
            case "score":
                return "💎";
            default:
                return "";
        }
    };

    const handleItemEffect = (type: Word["type"]) => {
        itemsCollectedRef.current += 1;
        playSound("item");
        switch (type) {
            case "life":
                setLives((prev) => Math.min(prev + 1, config.lives + 2));
                break;
            case "slow":
                applyEffect("slow", 8000);
                break;
            case "clear":
                setWords((curr) => curr.filter((w) => w.type !== "normal"));
                setScore((prev) => prev + 50 * level);
                break;
            case "shield":
                applyEffect("shield", 5000);
                break;
            case "score":
                setScore((prev) => prev + 200 * level);
                comboRef.current += 1;
                setCombo(comboRef.current);
                break;
        }
    };

    // 단어 낙하 루프 (requestAnimationFrame)
    const lastFrameRef = useRef(0);
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused) return;

        let rafId: number;
        const tick = (timestamp: number) => {
            if (!lastFrameRef.current) lastFrameRef.current = timestamp;
            const delta = timestamp - lastFrameRef.current;
            lastFrameRef.current = timestamp;

            const factor = Math.min(delta / 16, 3);

            setWords((currentWords) => {
                const gameAreaHeight = gameAreaRef.current?.offsetHeight ?? 600;
                const bottomThreshold = gameAreaHeight - 80;
                const speed = gameAreaHeight / (fallSeconds * 60);

                const updatedWords = currentWords.map((word) => {
                    if (word.status !== "falling") return word;
                    return { ...word, top: word.top + speed * factor };
                });

                const normalBottomWords = updatedWords.filter(
                    (word) => word.top > bottomThreshold && word.type === "normal" && word.status === "falling"
                );

                if (normalBottomWords.length > 0 && !shield && !lifeLostRef.current) {
                    lifeLostRef.current = true;
                    setTimeout(() => { lifeLostRef.current = false; }, 500);

                    playSound("lifeLost");
                    setLifeLostShake(true);
                    setTimeout(() => setLifeLostShake(false), 400);
                    setLives((prevLives) => {
                        const newLives = Math.max(prevLives - 1, 0);
                        if (newLives === 0) {
                            setGameOver(true);
                            playSound("crtOff");
                            playSound("gameOver");
                        }
                        return newLives;
                    });
                    comboRef.current = 0;
                    setCombo(0);
                }

                return updatedWords.map((word) => {
                    if (word.status === "falling" && word.top > bottomThreshold) {
                        return { ...word, status: "missed" as const };
                    }
                    return word;
                });
            });

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(rafId);
            lastFrameRef.current = 0;
        };
    }, [fallSeconds, gameStarted, gameOver, isPaused, shield, playSound]);

    // matched/missed 단어 일정 시간 후 제거
    useEffect(() => {
        const animatedWords = words.filter((w) => w.status !== "falling");
        if (animatedWords.length === 0) return;

        const timer = setTimeout(() => {
            animatedWords.forEach((word) => {
                claimedWordIdsRef.current.delete(word.id);
            });
            setWords((curr) => curr.filter((w) => w.status === "falling"));
        }, 450);

        return () => clearTimeout(timer);
    }, [words]);

    // 단어 스폰 루프
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused) return;

        const spawn = setInterval(spawnWord, spawnInterval);
        return () => clearInterval(spawn);
    }, [spawnWord, spawnInterval, gameStarted, gameOver, isPaused]);

    // 게임오버 시 하이스코어 갱신
    useEffect(() => {
        if (!gameOver) return;
        if (score > highScore) setHighScore(score);
    }, [gameOver, score, highScore, setHighScore]);

    const getLevelRequirements = (currentLevel: number) => ({
        scoreNeeded: currentLevel * config.scorePerLevel,
    });

    const clearInput = () => {
        setInput("");
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const handleSubmit = (): void => {
        const value = input;
        const matchedWord = findClaimableFallingWord(words, value, claimedWordIdsRef.current);

        if (matchedWord) {
            claimedWordIdsRef.current.add(matchedWord.id);

            const now = Date.now();
            const timeSinceLastType = lastTypedTime > 0 ? now - lastTypedTime : Infinity;
            setLastTypedTime(now);
            totalWordsTypedRef.current += 1;

            // 연쇄 클리어 감지 (1초 이내 연속 매칭)
            if (now - lastMatchTimeRef.current < 1000) {
                rapidMatchCountRef.current += 1;
                if (rapidMatchCountRef.current >= 2) {
                    showMultiKill(rapidMatchCountRef.current, matchedWord.left, matchedWord.top - 30);
                }
            } else {
                rapidMatchCountRef.current = 1;
            }
            lastMatchTimeRef.current = now;

            // 파티클 폭발
            spawnParticles(matchedWord.text, matchedWord.left, matchedWord.top);

            // 입력 파동 효과
            setInputRipple(true);
            setTimeout(() => setInputRipple(false), 400);

            setWords((curr) =>
                curr.map((word) =>
                    word.id === matchedWord.id
                        ? { ...word, status: "matched" as const }
                        : word
                )
            );
            clearInput();

            if (matchedWord.type === "golden") {
                // 골든 워드: 3배 점수
                const baseScore = matchedWord.text.length * 10 * 3;
                playSound("combo");
                playSound("match");
                setScore((prev) => {
                    const newScore = prev + baseScore;
                    const requirements = getLevelRequirements(level);
                    if (newScore >= requirements.scoreNeeded) {
                        setLevel((prevLevel) => prevLevel + 1);
                        setLevelUp(true);
                        playSound("win");
                        setTimeout(() => setLevelUp(false), 1000);
                    }
                    return newScore;
                });
                showScorePopup(`+${baseScore} ★`, matchedWord.left, matchedWord.top);
                comboRef.current += 1;
                setCombo(comboRef.current);
            } else if (matchedWord.type !== "normal") {
                handleItemEffect(matchedWord.type);
                showScorePopup(
                    getItemEmoji(matchedWord.type),
                    matchedWord.left,
                    matchedWord.top
                );
            } else {
                const {
                    nextCombo,
                    finalScore,
                    triggeredComboMilestone,
                    triggeredComboSound,
                } = calculateFallingWordsMatchScore(
                    comboRef.current,
                    matchedWord.text.length,
                    timeSinceLastType,
                );

                comboRef.current = nextCombo;
                setCombo(nextCombo);

                if (nextCombo > maxComboRef.current) {
                    maxComboRef.current = nextCombo;
                }

                playSound("match");

                if (triggeredComboSound) {
                    playSound("combo");
                }

                if (triggeredComboMilestone) {
                    setComboGlow(true);
                    setTimeout(() => setComboGlow(false), 800);
                    // 콤보 5+ shake 효과
                    setLifeLostShake(true);
                    setTimeout(() => setLifeLostShake(false), 200);
                }

                setScore((prev) => {
                    const newScore = prev + finalScore;
                    const requirements = getLevelRequirements(level);
                    if (newScore >= requirements.scoreNeeded) {
                        setLevel((prevLevel) => prevLevel + 1);
                        setLevelUp(true);
                        playSound("win");
                        setTimeout(() => setLevelUp(false), 1000);
                    }
                    return newScore;
                });

                showScorePopup(
                    `+${finalScore}`,
                    matchedWord.left,
                    matchedWord.top
                );
            }
        } else {
            comboRef.current = 0;
            setCombo(0);
            clearInput();
        }
    };

    const restartGame = (): void => {
        resetEffects();

        setWords([]);
        setScore(0);
        setLevel(1);
        setLives(DIFFICULTY_CONFIG[difficulty].lives);
        setGameOver(false);
        setGameStarted(false);
        setLevelUp(false);
        setCombo(0);
        comboRef.current = 0;
        setScorePopups([]);
        setParticles([]);
        setMultiKills([]);
        setIsPaused(false);
        clearInput();
        setLastTypedTime(0);
        lastMatchTimeRef.current = 0;
        rapidMatchCountRef.current = 0;
        claimedWordIdsRef.current.clear();
        if (language === "korean" && koreanWords.length === 0) {
            void fetchKoreanWords();
        }

        totalWordsTypedRef.current = 0;
        maxComboRef.current = 0;
        itemsCollectedRef.current = 0;

        setCountdown(3);
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (!isPaused && !gameOver && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isPaused, gameOver]);

    const renderActiveEffects = () => (
        <div className="absolute top-11 sm:top-14 right-2 sm:right-4 flex gap-2">
            {Array.from(activeEffects).map((effect) => (
                <div
                    key={effect}
                    className={`px-2.5 py-1 rounded-lg text-sm font-medium ${
                        darkMode ? "bg-white/10 text-white" : "bg-slate-800/10 text-slate-700"
                    }`}
                >
                    {effect === "slow" && "🐌 Slow"}
                    {effect === "shield" && "🛡️ Shield"}
                </div>
            ))}
        </div>
    );

    const getWordAnimClass = (word: Word) => {
        if (word.status === "matched") return "animate-word-matched";
        if (word.status === "missed") return "animate-word-missed";
        return "animate-word-spawn animate-word-float";
    };

    const targetWord = useMemo(() => {
        if (input.length === 0) return null;
        const fallingWords = words.filter((w) => w.status === "falling");
        const exact = fallingWords.find((w) => w.text.startsWith(input));
        if (exact) return exact;
        if (language === "korean") {
            const inputJamo = input.split("").flatMap(decomposeHangul);
            return fallingWords.find((w) => {
                const targetJamo = w.text.split("").flatMap(decomposeHangul);
                if (inputJamo.length > targetJamo.length) return false;
                return inputJamo.every((j, i) => j === targetJamo[i]);
            }) ?? null;
        }
        return fallingWords.find((w) => w.text[0] === input[0]) ?? null;
    }, [input, words, language]);

    const checkKoreanCharMatch = (target: string, userInput: string, charIndex: number): boolean => {
        if (charIndex < userInput.length - 1) {
            return target[charIndex] === userInput[charIndex];
        }
        const targetJamo = decomposeHangul(target[charIndex]);
        const inputJamo = decomposeHangul(userInput[charIndex]);
        return inputJamo.every((j, i) => j === targetJamo[i]);
    };

    const isNewHighScore = gameOver && score > 0 && score >= highScore;
    const retroRadiusClass = retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none";
    const retroSoftRadiusClass = retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none";
    const getWordSizeClass = (wordText: string) => {
        if (wordText.length >= 9) return "text-base sm:text-lg lg:text-xl";
        if (wordText.length >= 6) return "text-lg sm:text-xl lg:text-2xl";
        return "text-xl sm:text-2xl lg:text-3xl";
    };

    return (
        <div
            ref={gameAreaRef}
            className={`relative w-full flex-1 min-h-[360px] sm:min-h-[480px] lg:min-h-[560px] overflow-hidden ${retroRadiusClass} retro-monitor-bezel bg-[var(--retro-surface-alt)]`}
        >
            <div
                className={`absolute inset-0 ${lifeLostShake ? "animate-runner-shake" : ""}`}
                style={{
                    background: darkMode
                        ? `hsl(${240 - Math.min(level - 1, 10) * 5}, ${20 + Math.min(level - 1, 10) * 2}%, ${10 + Math.min(level - 1, 10)}%)`
                        : `hsl(${210 - Math.min(level - 1, 10) * 3}, ${8 + Math.min(level - 1, 10)}%, ${79 - Math.min(level - 1, 10) * 2}%)`,
                    transition: "background 1s ease",
                }}
            >
                <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 4px)",
                    }}
                />
                {/* 상단 아케이드 스코어바 */}
                <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-2.5 py-1.5 sm:px-5 sm:py-2.5 border-b-2 z-10 bg-[var(--retro-game-bg)] border-[var(--retro-game-panel-border-lo)]">
                    <div className="font-pixel text-[var(--retro-game-text)]" style={{ fontSize: "clamp(7px, 1.2vw, 10px)", lineHeight: 1.8 }} aria-live="polite" aria-atomic="true">
                        SCORE <span className="text-[var(--retro-game-warning)] tabular-nums">{score.toLocaleString().padStart(6, "0")}</span>
                        {highScore > 0 && (
                            <span className="ml-2 sm:ml-4 text-[var(--retro-game-text-dim)]">
                                HI <span className="text-[var(--retro-game-danger)] tabular-nums">{highScore.toLocaleString().padStart(6, "0")}</span>
                            </span>
                        )}
                        {combo > 0 && (
                            <span className="ml-2 sm:ml-4 text-[var(--retro-game-info)]">
                                x{Math.min(1 + combo * 0.2, 2).toFixed(1)}
                            </span>
                        )}
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md ${
                        difficulty === "easy" ? "bg-emerald-500/20 text-emerald-400"
                        : difficulty === "normal" ? "bg-sky-500/20 text-sky-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}>
                        {difficulty === "easy" ? "Easy" : difficulty === "normal" ? "Normal" : "Hard"}
                    </span>
                    <div className="font-pixel text-[var(--retro-game-text)]" style={{ fontSize: "clamp(7px, 1.2vw, 10px)", lineHeight: 1.8 }} aria-live="polite" aria-atomic="true">
                        LV.<span className="text-[var(--retro-game-success)] tabular-nums">{level}</span>
                    </div>
                    <div className="flex gap-0.5 text-base sm:text-lg lg:text-xl font-bold" aria-label={`Lives: ${lives} / ${config.lives}`}>
                        {Array.from({ length: config.lives }, (_, i) => (
                            <span
                                key={i}
                                className={`${i >= lives ? "grayscale opacity-40" : ""} ${
                                    i === lives && lifeLostShake ? "animate-heart-break" : ""
                                }`}
                            >
                                {i < lives ? "❤️" : "🖤"}
                            </span>
                        ))}
                    </div>
                </div>

                {renderActiveEffects()}
                {fallbackMessage && language === "korean" && (
                    <FallbackNotice
                        className="absolute top-[72px] left-2 right-2 sm:left-4 sm:right-4 z-20"
                        darkMode={darkMode}
                        message={fallbackMessage}
                        onRetry={() => {
                            void fetchKoreanWords();
                        }}
                    />
                )}

                {/* 콤보 글로우 */}
                {comboGlow && (
                    <div className="absolute inset-0 pointer-events-none z-5"
                        style={{
                            boxShadow: "inset 0 0 60px 15px rgba(56,189,248,0.15), inset 0 0 100px 30px rgba(56,189,248,0.08)",
                            animation: "game-screen-flash 800ms ease-out forwards",
                        }}
                    />
                )}

                {/* 콤보 카운터 (대형) */}
                {combo >= 3 && (
                    <div className="absolute top-11 sm:top-16 left-2 sm:left-5 z-10">
                        <div className="font-pixel" style={{ fontSize: combo >= 10 ? 18 : 12, lineHeight: 1.4 }}>
                            <span className={
                                combo >= 15 ? "text-[var(--retro-game-danger)] animate-combo-fire"
                                : combo >= 10 ? "text-[var(--retro-game-warning)] animate-combo-fire"
                                : combo >= 5 ? "text-[var(--retro-game-info)]"
                                : "text-[var(--retro-game-success)]"
                            }>
                                {combo}x
                            </span>
                        </div>
                        <div className="text-xs sm:text-sm font-bold font-mono mt-0.5" style={{
                            color: combo >= 10 ? "var(--retro-game-warning)" : "var(--retro-game-text-dim)",
                        }}>
                            COMBO {combo >= 15 ? "🔥" : combo >= 10 ? "⚡" : combo >= 5 ? "✨" : ""}
                        </div>
                    </div>
                )}

                {/* 레벨업 */}
                {levelUp && (
                    <>
                        <div className="absolute inset-0 pointer-events-none z-19 animate-screen-flash"
                            style={{ background: "rgba(255,224,0,0.15)" }}
                        />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-20">
                            <div className="font-pixel animate-celebration"
                                style={{ fontSize: 18, color: "var(--retro-game-warning)", textShadow: "0 0 20px rgba(251,191,36,0.6), 2px 2px 0 rgba(0,0,0,0.3)" }}
                            >
                                LEVEL UP!
                            </div>
                            <div className="font-pixel mt-3"
                                style={{ fontSize: 24, color: "var(--retro-game-info)", textShadow: "0 0 10px var(--retro-game-glow)" }}
                            >
                                LV.{level}
                            </div>
                        </div>
                    </>
                )}

                {/* 점수 팝업들 */}
                {scorePopups.map((popup) => (
                    <div
                        key={popup.id}
                        className="absolute animate-score-popup z-20 text-base sm:text-xl lg:text-2xl font-bold text-[var(--retro-game-info)] font-mono"
                        style={{ left: `${popup.left}px`, top: `${popup.top}px` }}
                    >
                        {popup.text}
                    </div>
                ))}

                {/* 파티클 폭발 */}
                {particles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute animate-word-particle z-20 font-pixel text-[var(--retro-game-info)]"
                        style={{
                            left: p.x,
                            top: p.y,
                            fontSize: 10,
                            "--px": `${p.dx}px`,
                            "--py": `${p.dy}px`,
                        } as React.CSSProperties}
                    >
                        {p.char}
                    </div>
                ))}

                {/* 연쇄 클리어 텍스트 */}
                {multiKills.map((mk) => (
                    <div
                        key={mk.id}
                        className="absolute animate-multi-kill z-30 font-pixel text-[var(--retro-game-warning)]"
                        style={{ left: mk.x, top: mk.y, fontSize: 14, textShadow: "0 0 10px rgba(250,204,21,0.6), 2px 2px 0 #000" }}
                    >
                        {mk.text}
                    </div>
                ))}

                {/* 떨어지는 단어들 */}
                {words.map((word) => {
                    const isTarget = targetWord?.id === word.id;
                    return (
                        <div
                            key={word.id}
                            className={`absolute ${getWordSizeClass(word.text)} font-bold font-mono flex items-center gap-1 sm:gap-2 ${getWordAnimClass(word)} ${
                                word.type === "golden"
                                    ? "animate-golden-shimmer drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                                    : word.type === "normal"
                                    ? darkMode
                                        ? "text-[var(--retro-game-text)] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
                                        : "text-[var(--retro-text)] drop-shadow-[1px_1px_0_rgba(255,255,255,0.5)]"
                                    : word.color
                            } ${
                                word.type !== "normal" && word.type !== "golden"
                                    ? `${retroSoftRadiusClass} px-2.5 py-1 border border-[var(--retro-border-mid)] bg-[var(--retro-surface)]`
                                    : word.type === "golden"
                                    ? `${retroSoftRadiusClass} px-2.5 py-1 border-2 border-yellow-500/50 bg-yellow-900/30`
                                    : ""
                            } ${isTarget ? "underline decoration-sky-400/50 decoration-2 underline-offset-4" : ""}`}
                            style={{
                                left: `${word.left}px`,
                                top: `${word.top}px`,
                                animationDelay: word.status === "falling" ? `${word.floatDelay}s` : undefined,
                            }}
                        >
                            {word.type === "golden" && <span>★</span>}
                            {word.type !== "normal" && word.type !== "golden" && (
                                <span>{getItemEmoji(word.type)}</span>
                            )}
                            {isTarget && input.length > 0 ? (
                                <span>
                                    {word.text.split("").map((char, idx) => {
                                        if (idx >= input.length) return <span key={idx}>{char}</span>;
                                        const isCorrect = language === "korean"
                                            ? checkKoreanCharMatch(word.text, input, idx)
                                            : input[idx] === char;
                                        return (
                                            <span key={idx} className={isCorrect ? "text-emerald-400" : "text-rose-500"}>
                                                {char}
                                            </span>
                                        );
                                    })}
                                </span>
                            ) : (
                                <span>{word.text}</span>
                            )}
                            {/* 타이핑 진행 게이지 */}
                            {isTarget && input.length > 0 && word.status === "falling" && (
                                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-[var(--retro-game-panel)]" style={{ opacity: 0.8 }}>
                                    <div
                                        className="h-full bg-[var(--retro-game-success)] transition-all duration-100"
                                        style={{ width: `${Math.min((input.length / word.text.length) * 100, 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* 하단 입력 영역 */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 border-t-2 bg-[var(--retro-surface)] border-[var(--retro-border-mid)] relative">
                    {inputRipple && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--retro-game-info)] animate-input-ripple origin-center" />
                    )}
                    <GameInput
                        inputRef={inputRef}
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSubmit}
                        disabled={!gameStarted || isPaused || gameOver}
                        className="w-full text-lg sm:text-xl lg:text-2xl py-3 sm:py-4"
                        placeholder={language === "korean" ? "" : "Type the word…"}
                        ariaLabel={language === "korean" ? "단어 낙하 입력" : "Falling words input"}
                    />
                </div>
            </div>

            {/* 시작 오버레이 */}
            {!gameStarted && !gameOver && countdown === null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-4">
                    <div className={`mx-auto w-full max-w-[18.5rem] text-center px-6 py-7 sm:max-w-sm sm:px-8 sm:py-8 ${retroRadiusClass} border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)] shadow-2xl`}>
                        <p className="font-pixel text-[var(--retro-game-warning)] mb-3" style={{ fontSize: 10, lineHeight: 1.6, animation: "tetris-blink 1s ease-in-out infinite" }}>
                            INSERT COIN
                        </p>
                        <div className="mb-3 text-4xl sm:text-5xl">🌧️</div>
                        <h2 className="mb-2 text-[clamp(1.9rem,4vw,2.7rem)] font-black text-[var(--retro-text)]">
                            {language === "korean" ? "소나기 모드" : "Falling Words"}
                        </h2>
                        <p className="mb-1 text-sm sm:text-[15px] text-[var(--retro-text)]/80">
                            {language === "korean"
                                ? "떨어지는 단어를 타이핑하세요!"
                                : "Type the falling words before they hit the ground!"}
                        </p>
                        <p className="mb-5 text-xs sm:text-sm text-[var(--retro-text)]/70">
                            {language === "korean"
                                ? "콤보를 쌓아 높은 점수를 노리세요"
                                : "Build combos for higher scores"}
                        </p>
                        <Button
                            onClick={() => restartGame()}
                            variant="secondary"
                            className={`h-auto w-full px-6 py-3.5 text-lg font-bold sm:py-4 ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                        >
                            {language === "korean" ? "시작" : "Start"}
                        </Button>
                    </div>
                </div>
            )}

            {/* 카운트다운 오버레이 */}
            {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 ">
                    <div key={countdown} className="animate-countdown text-7xl sm:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(56,189,248,0.6)]">
                        {countdown}
                    </div>
                </div>
            )}

            {/* 일시정지 오버레이 */}
            {isPaused && !gameOver && <PauseOverlay language={language} />}

            {/* 게임 오버 */}
            {gameOver && (
                <GameOverModal
                    title="Game Over!"
                    isHighScore={isNewHighScore}
                    badge={
                        isNewHighScore ? (
                            <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">
                                🏆 New Record!
                            </p>
                        ) : undefined
                    }
                    primaryStat={
                        <>
                            <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                                Final Score: <span className="font-bold tabular-nums">{score.toLocaleString()}</span>
                                {highScore > 0 && (
                                    <span className={`ml-2 text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                        🏆 Best: <span className="tabular-nums">{highScore.toLocaleString()}</span>
                                    </span>
                                )}
                            </p>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Level {level} reached
                            </p>
                        </>
                    }
                    stats={[
                        {
                            label: language === "korean" ? "단어 입력" : "Words typed",
                            value: `${totalWordsTypedRef.current}${language === "korean" ? "개" : ""}`,
                        },
                        {
                            label: language === "korean" ? "최대 콤보" : "Max combo",
                            value: maxComboRef.current,
                        },
                        {
                            label: language === "korean" ? "아이템 획득" : "Items collected",
                            value: `${itemsCollectedRef.current}${language === "korean" ? "개" : ""}`,
                        },
                        {
                            label: language === "korean" ? "플레이 시간" : "Play time",
                            value: formatPlayTime(Date.now() - gameStartTimeRef.current, language === "korean" ? "ko" : "en"),
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

export default FallingWordsGame;
