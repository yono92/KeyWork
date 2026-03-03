import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/word.json";
import { decomposeHangul } from "../utils/hangulUtils";
import { formatPlayTime } from "../utils/formatting";
import { useGameAudio } from "../hooks/useGameAudio";
import { usePauseHandler } from "../hooks/usePauseHandler";
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
    type: "normal" | "life" | "slow" | "clear" | "shield" | "score";
    color?: string;
    status: "falling" | "matched" | "missed";
    floatDelay: number; // 각 단어마다 다른 흔들림 타이밍
}

interface ScorePopup {
    id: number;
    text: string;
    left: number;
    top: number;
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
import { pickRandomStarts, HANGUL_WORD_REGEX } from "../utils/koreanConstants";

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
    const [slowMotion, setSlowMotion] = useState<boolean>(false);
    const [shield, setShield] = useState<boolean>(false);
    const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
    const [lastTypedTime, setLastTypedTime] = useState<number>(0);
    const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [koreanWords, setKoreanWords] = useState<string[]>([]);
    const [wordSource, setWordSource] = useState<"krdict" | "local">("local");
    const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recentWordsRef = useRef<string[]>([]);

    // 게임 통계 refs
    const totalWordsTypedRef = useRef(0);
    const maxComboRef = useRef(0);
    const gameStartTimeRef = useRef(Date.now());
    const itemsCollectedRef = useRef(0);

    const spawnInterval =
        Math.max(2000 - level * 100, 300) * (slowMotion ? 1.5 : 1) * config.spawnMul;
    // 바닥 도달 시간(초): 레벨 1 ≈ 6.7초, 레벨이 올라갈수록 빨라짐, 최소 1초
    const fallSeconds = Math.max(7 / (1 + level * 0.5), 1) * (slowMotion ? 2 : 1) / config.speedMul;

    const lifeLostRef = useRef(false);
    const activeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // 공유 훅: 효과음, 일시정지
    const { playSound } = useGameAudio();
    usePauseHandler(gameStarted, gameOver, setIsPaused);

    // 카운트다운 타이머
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

    const fetchKoreanWords = useCallback(async () => {
        if (language !== "korean") return;
        try {
            const starts = encodeURIComponent(pickRandomStarts(15).join(","));
            const response = await fetch(`/api/krdict/candidates?starts=${starts}&num=300`);
            if (!response.ok) {
                setWordSource("local");
                setFallbackMessage("사전 연결이 불안정해 로컬 단어로 진행 중입니다.");
                return;
            }
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
                    setWordSource("krdict");
                    setFallbackMessage(null);
                    return;
                }
            }
            setWordSource("local");
            setFallbackMessage("사전 응답이 비어 로컬 단어로 진행 중입니다.");
        } catch {
            setWordSource("local");
            setFallbackMessage("사전 연결 실패로 로컬 단어로 진행 중입니다.");
        }
    }, [language]);

    // 한국어 단어 풀 초기 로딩 + 부족 시 보충
    useEffect(() => {
        if (language === "korean" && koreanWords.length < 50) {
            void fetchKoreanWords();
        }
    }, [language, koreanWords.length, fetchKoreanWords]);

    useEffect(() => {
        recentWordsRef.current = [];
    }, [language]);

    const getSharedPrefixLength = useCallback((a: string, b: string): number => {
        const max = Math.min(a.length, b.length);
        let i = 0;
        while (i < max && a[i] === b[i]) i += 1;
        return i;
    }, []);

    const isTooSimilarWord = useCallback(
        (candidate: string, languageKey: "korean" | "english"): boolean => {
            const recent = recentWordsRef.current;
            for (let i = recent.length - 1; i >= 0; i -= 1) {
                const prev = recent[i];
                if (candidate === prev) return true;
                const sharedPrefix = getSharedPrefixLength(candidate, prev);
                const isImmediatePrevious = i === recent.length - 1;

                if (languageKey === "korean") {
                    if (sharedPrefix >= 2) return true;
                    if (isImmediatePrevious && sharedPrefix >= 1) return true;
                    continue;
                }

                if (sharedPrefix >= 3) return true;
            }
            return false;
        },
        [getSharedPrefixLength]
    );

    const getRandomWord = useCallback((): string => {
        if (language === "korean") {
            const pool = koreanWords.length > 0 ? koreanWords : wordsData.korean;
            const diversePool = pool.filter((w) => !isTooSimilarWord(w, "korean"));
            const finalPool = diversePool.length > 0 ? diversePool : pool;
            const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
            recentWordsRef.current = [...recentWordsRef.current.slice(-3), picked];
            return picked;
        }

        const wordsList = wordsData[language];
        if (!Array.isArray(wordsList) || wordsList.length === 0) {
            return "";
        }
        const diversePool = wordsList.filter((w) => !isTooSimilarWord(w, "english"));
        const finalPool = diversePool.length > 0 ? diversePool : wordsList;
        const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
        recentWordsRef.current = [...recentWordsRef.current.slice(-3), picked];
        return picked;
    }, [language, koreanWords, isTooSimilarWord]);

    const updateActiveEffects = (effect: string, duration: number) => {
        if (activeTimersRef.current[effect]) {
            clearTimeout(activeTimersRef.current[effect]);
        }

        setActiveEffects((prev) => new Set(prev).add(effect));

        if (effect === "slow") setSlowMotion(true);
        if (effect === "shield") setShield(true);

        activeTimersRef.current[effect] = setTimeout(() => {
            setActiveEffects((prev) => {
                const next = new Set(prev);
                next.delete(effect);
                return next;
            });

            if (effect === "slow") setSlowMotion(false);
            if (effect === "shield") setShield(false);

            delete activeTimersRef.current[effect];
        }, duration);
    };

    // 점수 팝업 표시
    const showScorePopup = (text: string, left: number, top: number) => {
        const id = Date.now() + Math.random();
        setScorePopups((prev) => [...prev, { id, text, left, top }]);
        setTimeout(() => {
            setScorePopups((prev) => prev.filter((p) => p.id !== id));
        }, 800);
    };

    const spawnWord = useCallback((): void => {
        if (gameOver || isPaused) return;

        const gameArea = gameAreaRef.current;
        const maxLeft = gameArea ? gameArea.offsetWidth - 120 : 0;

        const numWords = Math.min(1 + Math.floor(level / 2), 5);
        for (let i = 0; i < numWords; i++) {
            const wordText = getRandomWord();
            if (!wordText) continue;

            let wordType: Word["type"] = "normal";
            const random = Math.random();

            const itemChance = Math.min(0.05 + (level - 1) * 0.01, 0.2);

            if (random < itemChance) {
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
                    id: Date.now() + i,
                    text: wordText,
                    left: newLeft,
                    top: -40,
                    type: wordType,
                    color:
                        wordType !== "normal"
                            ? ITEM_TYPES[wordType].color
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
                updateActiveEffects("slow", 8000);
                break;
            case "clear":
                setWords((curr) => curr.filter((w) => w.type !== "normal"));
                setScore((prev) => prev + 50 * level);
                break;
            case "shield":
                updateActiveEffects("shield", 5000);
                break;
            case "score":
                setScore((prev) => prev + 200 * level);
                setCombo((prev) => prev + 2);
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

            // delta를 16ms 기준으로 정규화 (60fps 기준 1.0)
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
                    setLives((prevLives) => {
                        const newLives = Math.max(prevLives - 1, 0);
                        if (newLives === 0) {
                            setGameOver(true);
                            playSound("gameOver");
                        }
                        return newLives;
                    });
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

    // 게임오버 시 XP 지급 (1회만)
    const getLevelRequirements = (currentLevel: number) => ({
        scoreNeeded: currentLevel * config.scorePerLevel,
    });

    const clearInput = () => {
        setInput("");
        // IME 잔여 글자 방지: DOM 직접 클리어
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const handleSubmit = (): void => {
        const value = input;
        const matchedWord = words.find((word) => value === word.text && word.status === "falling");

        if (matchedWord) {
            const now = Date.now();
            const timeSinceLastType = lastTypedTime > 0 ? now - lastTypedTime : Infinity;
            setLastTypedTime(now);
            totalWordsTypedRef.current += 1;

            // matched 애니메이션으로 전환
            setWords((curr) =>
                curr.map((word) =>
                    word.id === matchedWord.id
                        ? { ...word, status: "matched" as const }
                        : word
                )
            );
            clearInput();

            if (matchedWord.type !== "normal") {
                handleItemEffect(matchedWord.type);
                showScorePopup(
                    getItemEmoji(matchedWord.type),
                    matchedWord.left,
                    matchedWord.top
                );
            } else {
                playSound("match");
                setCombo((prevCombo) => {
                    const newCombo = prevCombo + 1;

                    // 최대 콤보 추적
                    if (newCombo > maxComboRef.current) {
                        maxComboRef.current = newCombo;
                    }

                    // 콤보 5+ 효과음
                    if (newCombo >= 5) {
                        playSound("combo");
                    }

                    let wordScore = matchedWord.text.length * 10;
                    const comboMultiplier = Math.min(1 + newCombo * 0.2, 2);
                    wordScore *= comboMultiplier;

                    if (timeSinceLastType < 500) wordScore *= 1.5;

                    const finalScore = Math.round(wordScore);

                    setScore((prev) => {
                        const newScore = prev + finalScore;
                        const requirements = getLevelRequirements(level);
                        if (newScore >= requirements.scoreNeeded) {
                            setLevel((prevLevel) => prevLevel + 1);
                            setLevelUp(true);
                            playSound("levelUp");
                            setTimeout(() => setLevelUp(false), 1000);
                        }
                        return newScore;
                    });

                    // 점수 팝업
                    showScorePopup(
                        `+${finalScore}`,
                        matchedWord.left,
                        matchedWord.top
                    );

                    return newCombo;
                });
            }
        } else {
            setCombo(0);
            clearInput();
        }
    };

    const restartGame = (): void => {
        Object.values(activeTimersRef.current).forEach(clearTimeout);
        activeTimersRef.current = {};

        setWords([]);
        setScore(0);
        setLevel(1);
        setLives(DIFFICULTY_CONFIG[difficulty].lives);
        setGameOver(false);
        setGameStarted(false);
        setLevelUp(false);
        setCombo(0);
        setSlowMotion(false);
        setShield(false);
        setActiveEffects(new Set());
        setScorePopups([]);
        setIsPaused(false);
        clearInput();
        setLastTypedTime(0);
        if (language === "korean" && koreanWords.length === 0) {
            void fetchKoreanWords();
        }

        // 통계 리셋
        totalWordsTypedRef.current = 0;
        maxComboRef.current = 0;
        itemsCollectedRef.current = 0;
        recentWordsRef.current = [];

        // 카운트다운 시작 (3→2→1→GO)
        setCountdown(3);
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // 일시정지 해제 시 입력에 포커스
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

    // 실시간 입력 힌트: 타겟 단어 매칭
    const targetWord = useMemo(() => {
        if (input.length === 0) return null;
        const fallingWords = words.filter((w) => w.status === "falling");
        // startsWith 완전 매칭 우선
        const exact = fallingWords.find((w) => w.text.startsWith(input));
        if (exact) return exact;
        // 한국어: 조합 중인 글자를 위해 자모 분해 prefix 비교
        if (language === "korean") {
            const inputJamo = input.split("").flatMap(decomposeHangul);
            return fallingWords.find((w) => {
                const targetJamo = w.text.split("").flatMap(decomposeHangul);
                if (inputJamo.length > targetJamo.length) return false;
                return inputJamo.every((j, i) => j === targetJamo[i]);
            }) ?? null;
        }
        // 첫 글자 매칭 폴백
        return fallingWords.find((w) => w.text[0] === input[0]) ?? null;
    }, [input, words, language]);

    // 한국어 글자 단위 비교
    const checkKoreanCharMatch = (target: string, userInput: string, charIndex: number): boolean => {
        if (charIndex < userInput.length - 1) {
            return target[charIndex] === userInput[charIndex];
        }
        // 마지막 글자 (조합 중일 수 있음): 자모 분해 후 prefix 비교
        const targetJamo = decomposeHangul(target[charIndex]);
        const inputJamo = decomposeHangul(userInput[charIndex]);
        return inputJamo.every((j, i) => j === targetJamo[i]);
    };

    const isNewHighScore = gameOver && score > 0 && score >= highScore;
    const retroRadiusClass = retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none";
    const retroSoftRadiusClass = retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none";

    return (
        <div
            ref={gameAreaRef}
            className={`relative w-full flex-1 min-h-[280px] sm:min-h-[400px] overflow-hidden ${retroRadiusClass} border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface-alt)]`}
        >
            <div className={`absolute inset-0 ${darkMode ? "bg-[#1f2730]" : "bg-[var(--retro-surface-alt)]"}`}>
                <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 4px)",
                    }}
                />
                {/* 상단 스코어바 */}
                <div className={`absolute top-0 left-0 right-0 flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 border-b-2 z-10 bg-[var(--retro-surface)] border-[var(--retro-border-mid)]`}>
                    <div className={`text-xs sm:text-lg font-bold font-mono text-[var(--retro-text)]`}>
                        Score: <span className="tabular-nums">{score}</span>
                        {highScore > 0 && (
                            <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs font-medium text-[var(--retro-text)]/70">
                                Best: <span className="tabular-nums">{highScore}</span>
                            </span>
                        )}
                        {combo > 0 && (
                            <span className="ml-1 sm:ml-2 text-[10px] sm:text-sm text-sky-400">
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
                    <div className="text-xs sm:text-lg font-bold font-mono text-[var(--retro-text)]">
                        Lv.<span className="tabular-nums">{level}</span>
                    </div>
                    <div className="text-sm sm:text-lg font-bold">
                        {"❤️".repeat(Math.max(lives, 0))}
                        {"🖤".repeat(Math.max(config.lives - lives, 0))}
                    </div>
                </div>

                {renderActiveEffects()}
                {fallbackMessage && language === "korean" && (
                    <FallbackNotice
                        className="absolute top-[72px] left-2 right-2 sm:left-4 sm:right-4 z-20"
                        darkMode={darkMode}
                        message={fallbackMessage}
                        sourceLabel={wordSource === "krdict" ? "krdict" : "local word.json"}
                        onRetry={() => {
                            void fetchKoreanWords();
                        }}
                    />
                )}

                {/* 콤보 표시 */}
                {combo >= 3 && (
                    <div className="absolute top-11 sm:top-14 left-2 sm:left-5 z-10">
                        <div
                        className={`text-sm sm:text-lg font-bold font-mono ${
                                combo >= 10
                                    ? "text-amber-400"
                                    : combo >= 5
                                    ? "text-sky-400"
                                    : "text-emerald-400"
                            }`}
                        >
                            {combo} Combo!{" "}
                            {combo >= 15 ? " 🔥" : combo >= 3 ? " ⚡" : " ✨"}
                        </div>
                    </div>
                )}

                {/* 레벨업 */}
                {levelUp && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-20">
                        <div className="text-2xl sm:text-4xl font-bold text-amber-400 animate-bounce">
                            Level Up! 🎯
                        </div>
                        <div className="text-sm sm:text-lg text-sky-400 mt-2">
                            Next goal:{" "}
                            {getLevelRequirements(level + 1).scoreNeeded} points
                        </div>
                    </div>
                )}

                {/* 점수 팝업들 */}
                {scorePopups.map((popup) => (
                    <div
                        key={popup.id}
                        className="absolute animate-score-popup z-20 text-sm sm:text-lg font-bold text-sky-400 font-mono"
                        style={{ left: `${popup.left}px`, top: `${popup.top}px` }}
                    >
                        {popup.text}
                    </div>
                ))}

                {/* 떨어지는 단어들 */}
                {words.map((word) => {
                    const isTarget = targetWord?.id === word.id;
                    return (
                        <div
                            key={word.id}
                            className={`absolute text-sm sm:text-lg font-bold font-mono flex items-center gap-1 sm:gap-1.5 ${getWordAnimClass(word)} ${
                                word.type === "normal"
                                    ? darkMode
                                        ? "text-[#f5f7fa] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
                                        : "text-[var(--retro-text)] drop-shadow-[1px_1px_0_rgba(255,255,255,0.5)]"
                                    : word.color
                            } ${
                                word.type !== "normal"
                                    ? `${retroSoftRadiusClass} px-2.5 py-1 border border-[var(--retro-border-mid)] bg-[var(--retro-surface)]`
                                    : ""
                            } ${isTarget ? "underline decoration-sky-400/50 decoration-2 underline-offset-4" : ""}`}
                            style={{
                                left: `${word.left}px`,
                                top: `${word.top}px`,
                                animationDelay: word.status === "falling" ? `${word.floatDelay}s` : undefined,
                            }}
                        >
                            {word.type !== "normal" && (
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
                        </div>
                    );
                })}

                {/* 하단 입력 영역 */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 border-t-2 bg-[var(--retro-surface)] border-[var(--retro-border-mid)]">
                    <GameInput
                        inputRef={inputRef}
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSubmit}
                        disabled={!gameStarted || isPaused || gameOver}
                        placeholder={language === "korean" ? "" : "Type the word…"}
                        ariaLabel={language === "korean" ? "단어 낙하 입력" : "Falling words input"}
                    />
                </div>
            </div>

            {/* 시작 오버레이 */}
            {!gameStarted && !gameOver && countdown === null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`text-center px-8 py-8 ${retroRadiusClass} border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface)] shadow-2xl max-w-xs mx-4`}>
                        <div className="text-5xl mb-3">🌧️</div>
                        <h2 className="text-2xl sm:text-3xl font-black mb-2 text-[var(--retro-text)]">
                            {language === "korean" ? "소나기 모드" : "Falling Words"}
                        </h2>
                        <p className="text-sm mb-1 text-[var(--retro-text)]/80">
                            {language === "korean"
                                ? "떨어지는 단어를 타이핑하세요!"
                                : "Type the falling words before they hit the ground!"}
                        </p>
                        <p className="text-xs mb-5 text-[var(--retro-text)]/70">
                            {language === "korean"
                                ? "콤보를 쌓아 높은 점수를 노리세요"
                                : "Build combos for higher scores"}
                        </p>
                        <Button
                            onClick={() => restartGame()}
                            variant="secondary"
                            className={`w-full h-auto px-6 py-3 font-bold text-lg ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                        >
                            {language === "korean" ? "시작" : "Start"}
                        </Button>
                    </div>
                </div>
            )}

            {/* 카운트다운 오버레이 */}
            {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
