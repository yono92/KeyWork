import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/word.json";
import { decomposeHangul } from "../utils/hangulUtils";


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

type SoundType = "match" | "combo" | "item" | "lifeLost" | "levelUp" | "gameOver";

const DIFFICULTY_CONFIG = {
    easy:   { spawnMul: 1.5, speedMul: 0.7, lives: 3, scorePerLevel: 400 },
    normal: { spawnMul: 1.0, speedMul: 1.0, lives: 3, scorePerLevel: 500 },
    hard:   { spawnMul: 0.7, speedMul: 1.3, lives: 3, scorePerLevel: 600 },
} as const;

const FallingWordsGame: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const language = useTypingStore((state) => state.language);
    const isMuted = useTypingStore((state) => state.isMuted);
    const highScore = useTypingStore((state) => state.highScore);
    const setHighScore = useTypingStore((state) => state.setHighScore);
    const difficulty = useTypingStore((state) => state.difficulty);
    const setDifficulty = useTypingStore((state) => state.setDifficulty);

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

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isComposingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    // 게임 통계 refs
    const totalWordsTypedRef = useRef(0);
    const maxComboRef = useRef(0);
    const gameStartTimeRef = useRef(Date.now());
    const itemsCollectedRef = useRef(0);

    const spawnInterval =
        Math.max(2000 - level * 100, 300) * (slowMotion ? 1.5 : 1) * config.spawnMul;
    // 바닥 도달 시간(초): 레벨 1 ≈ 6.7초, 레벨이 올라갈수록 빨라짐, 최소 1초
    const fallSeconds = Math.max(10 / (1 + level * 0.5), 1) * (slowMotion ? 2 : 1) / config.speedMul;

    const lifeLostRef = useRef(false);
    const activeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // 효과음 재생
    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") ctx.resume();

            const now = ctx.currentTime;

            switch (type) {
                case "match": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(660, now);
                    osc.frequency.linearRampToValueAtTime(880, now + 0.08);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.08);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.08);
                    break;
                }
                case "combo": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.linearRampToValueAtTime(1100, now + 0.1);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.1);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                }
                case "item": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(520, now);
                    osc.frequency.linearRampToValueAtTime(780, now + 0.12);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.12);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.12);
                    break;
                }
                case "lifeLost": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.2);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                }
                case "levelUp": {
                    // 3단계 sweep: 440→660→880
                    for (let i = 0; i < 3; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "sine";
                        const startFreq = 440 + i * 220;
                        const offset = i * 0.1;
                        osc.frequency.setValueAtTime(startFreq, now + offset);
                        gain.gain.setValueAtTime(0.15, now + offset);
                        gain.gain.linearRampToValueAtTime(0, now + offset + 0.1);
                        osc.connect(gain).connect(ctx.destination);
                        osc.start(now + offset);
                        osc.stop(now + offset + 0.1);
                    }
                    break;
                }
                case "gameOver": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.linearRampToValueAtTime(220, now + 0.25);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.5);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.5);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.5);
                    break;
                }
            }
        } catch {
            // AudioContext 생성 실패 시 무시
        }
    }, [isMuted]);

    const getRandomWord = (): string => {
        const wordsList = wordsData[language];
        if (!Array.isArray(wordsList) || wordsList.length === 0) {
            console.error("Invalid words data structure");
            return "";
        }
        return wordsList[Math.floor(Math.random() * wordsList.length)];
    };

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
    }, [gameOver, isPaused, language, level]);

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

    // 단어 낙하 루프
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused) return;

        const moveWords = setInterval(() => {
            setWords((currentWords) => {
                const gameAreaHeight = gameAreaRef.current?.offsetHeight ?? 600;
                const bottomThreshold = gameAreaHeight - 80;
                // 게임 영역 높이 기반 속도: 어떤 화면이든 동일한 시간에 바닥 도달
                const speed = gameAreaHeight / (fallSeconds * 60);

                const updatedWords = currentWords.map((word) => {
                    if (word.status !== "falling") return word;
                    return { ...word, top: word.top + speed };
                });

                // 바닥에 닿은 falling 상태의 일반 단어 확인
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

                // 바닥에 닿은 falling 단어 → missed 애니메이션 전환
                const result = updatedWords.map((word) => {
                    if (word.status === "falling" && word.top > bottomThreshold) {
                        return { ...word, status: "missed" as const };
                    }
                    return word;
                });

                // matched/missed 애니메이션 끝난 단어 제거 (top이 매우 아래이거나 오래된 것)
                return result;
            });
        }, 16);

        return () => clearInterval(moveWords);
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

    // ESC 키로 일시정지/재개
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && gameStarted && !gameOver) {
                setIsPaused((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [gameOver]);

    // 게임오버 시 하이스코어 갱신
    useEffect(() => {
        if (gameOver && score > highScore) {
            setHighScore(score);
        }
    }, [gameOver, score, highScore, setHighScore]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setInput(e.target.value);
    };

    // 한글 IME 조합 상태 추적
    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposingRef.current = false;
        // compositionend 시점의 값으로 input 동기화
        setInput((e.target as HTMLInputElement).value);
    };

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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key !== "Enter") return;

        // 한글 IME 조합 중이면 무시
        if (isComposingRef.current || e.nativeEvent.isComposing) return;

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
                    const comboMultiplier = 1 + Math.min(newCombo * 0.2, 2);
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

    const restartGame = (overrideDifficulty?: keyof typeof DIFFICULTY_CONFIG): void => {
        const d = overrideDifficulty ?? difficulty;
        Object.values(activeTimersRef.current).forEach(clearTimeout);
        activeTimersRef.current = {};

        setWords([]);
        setScore(0);
        setLevel(1);
        setLives(DIFFICULTY_CONFIG[d].lives);
        setGameOver(false);
        setGameStarted(true);
        setLevelUp(false);
        setCombo(0);
        setSlowMotion(false);
        setShield(false);
        setActiveEffects(new Set());
        setScorePopups([]);
        setIsPaused(false);
        clearInput();
        setLastTypedTime(0);

        // 통계 리셋
        totalWordsTypedRef.current = 0;
        maxComboRef.current = 0;
        gameStartTimeRef.current = Date.now();
        itemsCollectedRef.current = 0;

        if (inputRef.current) {
            inputRef.current.focus();
        }
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

    const formatPlayTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}분 ${sec.toString().padStart(2, "0")}초`;
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

    return (
        <div
            ref={gameAreaRef}
            className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10"
        >
            <div className={`absolute inset-0 ${darkMode ? "bg-[#0e1825]" : "bg-gradient-to-b from-sky-50/80 to-white"}`}>
                {/* 상단 스코어바 */}
                <div className={`absolute top-0 left-0 right-0 flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Score: <span className="tabular-nums">{score}</span>
                        {highScore > 0 && (
                            <span className={`ml-1 sm:ml-2 text-[10px] sm:text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Best: <span className="tabular-nums">{highScore}</span>
                            </span>
                        )}
                        {combo > 0 && (
                            <span className="ml-1 sm:ml-2 text-[10px] sm:text-sm text-sky-400">
                                x{(1 + Math.min(combo * 0.2, 2)).toFixed(1)}
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
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Lv.<span className="tabular-nums">{level}</span>
                    </div>
                    <div className={`text-sm sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        {"❤️".repeat(Math.max(lives, 0))}
                        {"🖤".repeat(Math.max(config.lives - lives, 0))}
                    </div>
                </div>

                {renderActiveEffects()}

                {/* 콤보 표시 */}
                {combo >= 3 && (
                    <div className="absolute top-11 sm:top-14 left-2 sm:left-5 z-10">
                        <div
                            className={`text-sm sm:text-lg font-bold ${
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
                        className="absolute animate-score-popup z-20 text-sm sm:text-lg font-bold text-sky-400"
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
                            className={`absolute text-sm sm:text-lg font-bold flex items-center gap-1 sm:gap-1.5 ${getWordAnimClass(word)} ${
                                word.type === "normal"
                                    ? darkMode
                                        ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                                        : "text-slate-800 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                                    : word.color
                            } ${
                                word.type !== "normal"
                                    ? "rounded-lg px-2.5 py-1 " +
                                      (darkMode ? "bg-white/10 backdrop-blur-sm shadow-lg" : "bg-white/60 backdrop-blur-sm shadow-md")
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
                <div className={`absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 backdrop-blur-sm border-t ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        disabled={!gameStarted || isPaused || gameOver}
                        className={`w-full px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg rounded-xl outline-none transition-all duration-200 border-2 ${
                            darkMode
                                ? "bg-white/[0.04] text-white border-white/[0.08] focus:border-sky-500/50 focus:bg-white/[0.06]"
                                : "bg-white text-slate-800 border-sky-200/60 focus:border-sky-400"
                        } focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50`}
                        placeholder={
                            language === "korean" ? "" : "Type the word..."
                        }
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* 난이도 선택 오버레이 */}
            {!gameStarted && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {language === "korean" ? "소나기 모드" : "Falling Words"}
                        </h2>
                        <p className={`text-sm mb-4 sm:mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {language === "korean" ? "난이도를 선택하세요" : "Select difficulty"}
                        </p>
                        <div className="flex flex-col gap-2.5 sm:gap-3">
                            {(["easy", "normal", "hard"] as const).map((d) => {
                                const colors = {
                                    easy: "border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10",
                                    normal: "border-sky-500/30 hover:border-sky-400 hover:bg-sky-500/10",
                                    hard: "border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/10",
                                };
                                const labelColors = {
                                    easy: "text-emerald-400",
                                    normal: "text-sky-400",
                                    hard: "text-rose-400",
                                };
                                const descriptions = {
                                    easy: language === "korean" ? "느린 속도, 라이프 3개" : "Slow speed, 3 lives",
                                    normal: language === "korean" ? "보통 속도, 라이프 3개" : "Normal speed, 3 lives",
                                    hard: language === "korean" ? "빠른 속도, 라이프 3개" : "Fast speed, 3 lives",
                                };
                                return (
                                    <button
                                        key={d}
                                        onClick={() => {
                                            setDifficulty(d);
                                            restartGame(d);
                                        }}
                                        className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${colors[d]} ${
                                            darkMode ? "bg-white/[0.03]" : "bg-slate-50"
                                        }`}
                                    >
                                        <div className={`text-base sm:text-lg font-bold ${labelColors[d]}`}>
                                            {d === "easy" ? "Easy" : d === "normal" ? "Normal" : "Hard"}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                            {descriptions[d]}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 일시정지 오버레이 */}
            {isPaused && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                    <div className="text-center">
                        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">PAUSED</h2>
                        <p className="text-sm sm:text-lg text-slate-300">
                            {language === "korean" ? "ESC를 눌러 계속" : "Press ESC to continue"}
                        </p>
                    </div>
                </div>
            )}

            {/* 게임 오버 */}
            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                    <div
                        className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                            darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                        } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}
                    >
                        <h2
                            className={`text-xl sm:text-3xl font-bold mb-1 ${
                                darkMode ? "text-white" : "text-slate-800"
                            }`}
                        >
                            Game Over!
                        </h2>

                        {isNewHighScore && (
                            <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">
                                🏆 New Record!
                            </p>
                        )}

                        <div className={`border-t border-b py-3 my-3 ${darkMode ? "border-white/10" : "border-slate-200"}`}>
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
                        </div>

                        <div className={`text-sm space-y-1.5 mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <p>{language === "korean" ? "단어 입력" : "Words typed"}: <span className="font-medium tabular-nums">{totalWordsTypedRef.current}{language === "korean" ? "개" : ""}</span></p>
                            <p>{language === "korean" ? "최대 콤보" : "Max combo"}: <span className="font-medium tabular-nums">{maxComboRef.current}</span></p>
                            <p>{language === "korean" ? "아이템 획득" : "Items collected"}: <span className="font-medium tabular-nums">{itemsCollectedRef.current}{language === "korean" ? "개" : ""}</span></p>
                            <p>{language === "korean" ? "플레이 시간" : "Play time"}: <span className="font-medium tabular-nums">{formatPlayTime(Date.now() - gameStartTimeRef.current)}</span></p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
                            <button
                                onClick={() => restartGame()}
                                className="px-5 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base"
                            >
                                {language === "korean" ? "다시 하기" : "Play Again"}
                            </button>
                            <button
                                onClick={() => { restartGame(); setGameStarted(false); }}
                                className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base ${
                                    darkMode
                                        ? "border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                            >
                                {language === "korean" ? "난이도 변경" : "Change Difficulty"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FallingWordsGame;
