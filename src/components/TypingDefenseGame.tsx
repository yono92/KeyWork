import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/word.json";
import proverbsData from "../data/proverbs.json";

type SoundType = "hit" | "destroy" | "bossHit" | "baseDamage" | "waveComplete" | "gameOver";

interface Enemy {
    id: number;
    text: string;
    left: number; // 0~100 (%)
    lane: number; // 0~4
    speed: number; // %/초
    type: "normal" | "boss";
    hp: number;
    maxHp: number;
    status: "active" | "destroyed";
}

const DIFFICULTY_CONFIG = {
    easy:   { speedMul: 0.7, spawnMul: 1.5, baseHp: 3 },
    normal: { speedMul: 1.0, spawnMul: 1.0, baseHp: 3 },
    hard:   { speedMul: 1.3, spawnMul: 0.7, baseHp: 3 },
} as const;
const KOREAN_START_POOL = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
const HANGUL_WORD_REGEX = /^[\uAC00-\uD7A3]{2,}$/;

const LANE_COUNT = 5;

const TypingDefenseGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const language = useTypingStore((s) => s.language);
    const isMuted = useTypingStore((s) => s.isMuted);
    const difficulty = useTypingStore((s) => s.difficulty);
    const setDifficulty = useTypingStore((s) => s.setDifficulty);

    const config = DIFFICULTY_CONFIG[difficulty];

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [wave, setWave] = useState(1);
    const [score, setScore] = useState(0);
    const [baseHp, setBaseHp] = useState<number>(config.baseHp);
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [input, setInput] = useState("");
    const [waveEnemiesLeft, setWaveEnemiesLeft] = useState(0);
    const [waveCleared, setWaveCleared] = useState(false);
    const [totalSpawned, setTotalSpawned] = useState(0);
    const [koreanWords, setKoreanWords] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const isComposingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const gameStartTimeRef = useRef(Date.now());
    const enemiesDestroyedRef = useRef(0);
    const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const waveRef = useRef(1);

    // wave ref 동기화 (closure 문제 방지)
    useEffect(() => { waveRef.current = wave; }, [wave]);

    const getWaveConfig = useCallback((w: number) => {
        const enemyCount = 5 + w * 3;
        const spawnInterval = Math.max(2000 - w * 100, 800) * config.spawnMul;
        const baseSpeed = 8 + w * 0.5;
        const isBossWave = w % 5 === 0;
        const bossHp = 3 + Math.floor(w / 5);
        return { enemyCount, spawnInterval, baseSpeed, isBossWave, bossHp };
    }, [config.spawnMul]);

    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
    }, []);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;
        if (!audioContextRef.current) return;
        try {
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") ctx.resume();
            const now = ctx.currentTime;

            switch (type) {
                case "hit": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(800, now);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.03);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.03);
                    break;
                }
                case "destroy": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.1);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.1);
                    break;
                }
                case "bossHit": {
                    for (let i = 0; i < 2; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "square";
                        const offset = i * 0.06;
                        osc.frequency.setValueAtTime(330 + i * 110, now + offset);
                        gain.gain.setValueAtTime(0.1, now + offset);
                        gain.gain.linearRampToValueAtTime(0, now + offset + 0.08);
                        osc.connect(gain).connect(ctx.destination);
                        osc.start(now + offset); osc.stop(now + offset + 0.08);
                    }
                    break;
                }
                case "baseDamage": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.2);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.2);
                    break;
                }
                case "waveComplete": {
                    for (let i = 0; i < 3; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "sine";
                        const offset = i * 0.1;
                        osc.frequency.setValueAtTime(440 + i * 220, now + offset);
                        gain.gain.setValueAtTime(0.15, now + offset);
                        gain.gain.linearRampToValueAtTime(0, now + offset + 0.1);
                        osc.connect(gain).connect(ctx.destination);
                        osc.start(now + offset); osc.stop(now + offset + 0.1);
                    }
                    break;
                }
                case "gameOver": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.5);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.5);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.5);
                    break;
                }
            }
        } catch { /* ignore */ }
    }, [isMuted]);

    // 유저 제스처로 AudioContext 초기화
    useEffect(() => {
        const handler = () => initAudioContext();
        window.addEventListener("click", handler, { once: true });
        window.addEventListener("keydown", handler, { once: true });
        return () => {
            window.removeEventListener("click", handler);
            window.removeEventListener("keydown", handler);
        };
    }, [initAudioContext]);

    const fetchKoreanWords = useCallback(async () => {
        if (language !== "korean") return;
        try {
            const starts = encodeURIComponent(KOREAN_START_POOL.join(","));
            const response = await fetch(`/api/krdict/candidates?starts=${starts}&num=220`);
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

    const getRandomWord = useCallback((): string => {
        if (language === "korean") {
            if (koreanWords.length === 0) {
                void fetchKoreanWords();
                return "";
            }
            if (koreanWords.length < 50) {
                void fetchKoreanWords();
            }
            return koreanWords[Math.floor(Math.random() * koreanWords.length)];
        }

        const wordsList = wordsData[language];
        return wordsList[Math.floor(Math.random() * wordsList.length)];
    }, [language, koreanWords, fetchKoreanWords]);

    const getRandomSentence = useCallback((): string => {
        const sentences = proverbsData[language];
        return sentences[Math.floor(Math.random() * sentences.length)];
    }, [language]);

    // 적 스폰
    const spawnEnemy = useCallback(() => {
        const w = waveRef.current;
        const waveConfig = getWaveConfig(w);

        setTotalSpawned((prev) => {
            if (prev >= waveConfig.enemyCount) return prev;

            const isLastAndBoss = waveConfig.isBossWave && prev === waveConfig.enemyCount - 1;
            const lane = Math.floor(Math.random() * LANE_COUNT);
            const speed = (waveConfig.baseSpeed + Math.random() * 2) * config.speedMul;

            const newEnemy: Enemy | null = isLastAndBoss
                ? {
                    id: Date.now() + Math.random(),
                    text: getRandomSentence(),
                    left: 0,
                    lane,
                    speed: speed * 0.6, // 보스는 느림
                    type: "boss",
                    hp: waveConfig.bossHp,
                    maxHp: waveConfig.bossHp,
                    status: "active",
                }
                : (() => {
                    const word = getRandomWord();
                    if (!word) return null;
                    return {
                        id: Date.now() + Math.random(),
                        text: word,
                        left: 0,
                        lane,
                        speed,
                        type: "normal",
                        hp: 1,
                        maxHp: 1,
                        status: "active",
                    };
                })();

            if (!newEnemy) {
                return prev;
            }

            setEnemies((prev) => [...prev, newEnemy]);
            setWaveEnemiesLeft((prev) => prev + 1);
            return prev + 1;
        });
    }, [getWaveConfig, config.speedMul, getRandomSentence, getRandomWord]);

    // 적 이동 루프
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || waveCleared) return;

        const moveInterval = setInterval(() => {
            setEnemies((current) => {
                let hitsInTick = 0;

                const updated = current.map((enemy) => {
                    if (enemy.status !== "active") return enemy;
                    const newLeft = enemy.left + enemy.speed * (16 / 1000); // 16ms tick
                    if (newLeft >= 100) {
                        hitsInTick++;
                        return { ...enemy, left: 100, status: "destroyed" as const };
                    }
                    return { ...enemy, left: newLeft };
                });

                if (hitsInTick > 0) {
                    for (let i = 0; i < hitsInTick; i++) playSound("baseDamage");
                    setBaseHp((prev) => {
                        const newHp = prev - hitsInTick;
                        if (newHp <= 0) {
                            setGameOver(true);
                            playSound("gameOver");
                        }
                        return Math.max(newHp, 0);
                    });
                    setWaveEnemiesLeft((prev) => Math.max(prev - hitsInTick, 0));
                }

                return updated;
            });
        }, 16);

        return () => clearInterval(moveInterval);
    }, [gameStarted, gameOver, isPaused, waveCleared, playSound]);

    // destroyed 적 제거
    useEffect(() => {
        const destroyedEnemies = enemies.filter((e) => e.status === "destroyed");
        if (destroyedEnemies.length === 0) return;
        const timer = setTimeout(() => {
            setEnemies((curr) => curr.filter((e) => e.status === "active"));
        }, 300);
        return () => clearTimeout(timer);
    }, [enemies]);

    // 적 스폰 루프
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || waveCleared) return;

        const waveConfig = getWaveConfig(wave);
        spawnTimerRef.current = setInterval(() => {
            spawnEnemy();
        }, waveConfig.spawnInterval);

        return () => {
            if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
        };
    }, [gameStarted, gameOver, isPaused, waveCleared, wave, spawnEnemy, getWaveConfig]);

    // 웨이브 클리어 체크
    useEffect(() => {
        const waveConfig = getWaveConfig(wave);
        if (
            gameStarted && !gameOver && !waveCleared &&
            totalSpawned >= waveConfig.enemyCount &&
            waveEnemiesLeft <= 0
        ) {
            setWaveCleared(true);
            playSound("waveComplete");
        }
    }, [totalSpawned, waveEnemiesLeft, wave, gameStarted, gameOver, waveCleared, getWaveConfig, playSound]);

    // ESC 일시정지
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && gameStarted && !gameOver) {
                setIsPaused((p) => !p);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [gameStarted, gameOver]);

    useEffect(() => {
        if (!isPaused && !gameOver && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver]);

    // prefix 매칭되는 적 하이라이트
    const highlightedEnemy = useMemo(() => {
        if (!input) return null;
        const active = enemies.filter((e) => e.status === "active");
        // 정확히 시작하는 적 우선
        return active.find((e) => e.text.startsWith(input)) ?? null;
    }, [input, enemies]);

    const clearInput = () => {
        setInput("");
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        initAudioContext();
        if (e.key !== "Enter") return;
        if (isComposingRef.current || e.nativeEvent.isComposing) return;

        const value = input.trim();
        if (!value) return;

        // 일치하는 적 찾기
        const matchedEnemy = enemies.find(
            (e) => e.status === "active" && e.text === value
        );

        if (matchedEnemy) {
            if (matchedEnemy.type === "boss") {
                // 보스: HP -1
                playSound("bossHit");
                setEnemies((curr) =>
                    curr.map((e) => {
                        if (e.id !== matchedEnemy.id) return e;
                        const newHp = e.hp - 1;
                        if (newHp <= 0) {
                            enemiesDestroyedRef.current++;
                            setWaveEnemiesLeft((prev) => Math.max(prev - 1, 0));
                            setScore((prev) => prev + e.text.length * 20);
                            playSound("destroy");
                            return { ...e, hp: 0, status: "destroyed" as const };
                        }
                        return { ...e, hp: newHp };
                    })
                );
            } else {
                // 일반 적: 즉시 파괴
                playSound("destroy");
                enemiesDestroyedRef.current++;
                setEnemies((curr) =>
                    curr.map((e) =>
                        e.id === matchedEnemy.id ? { ...e, status: "destroyed" as const } : e
                    )
                );
                setWaveEnemiesLeft((prev) => Math.max(prev - 1, 0));
                setScore((prev) => prev + matchedEnemy.text.length * 10);
            }
            clearInput();
        } else {
            // 미스
            clearInput();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleCompositionStart = () => { isComposingRef.current = true; };
    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposingRef.current = false;
        setInput((e.target as HTMLInputElement).value);
    };

    const startNextWave = () => {
        setWave((w) => w + 1);
        setWaveCleared(false);
        setTotalSpawned(0);
        setWaveEnemiesLeft(0);
        setEnemies([]);
        clearInput();
        if (inputRef.current) inputRef.current.focus();
    };

    const restartGame = (overrideDifficulty?: keyof typeof DIFFICULTY_CONFIG) => {
        const d = overrideDifficulty ?? difficulty;
        const cfg = DIFFICULTY_CONFIG[d];
        setWave(1);
        setScore(0);
        setBaseHp(cfg.baseHp);
        setEnemies([]);
        setInput("");
        setGameOver(false);
        setGameStarted(true);
        setIsPaused(false);
        setWaveCleared(false);
        setTotalSpawned(0);
        setWaveEnemiesLeft(0);
        enemiesDestroyedRef.current = 0;
        gameStartTimeRef.current = Date.now();
        if (language === "korean" && koreanWords.length === 0) {
            void fetchKoreanWords();
        }
        if (inputRef.current) inputRef.current.focus();
    };

    const formatPlayTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}분 ${sec.toString().padStart(2, "0")}초`;
    };

    const laneHeight = 100 / LANE_COUNT;

    return (
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10">
            <div className={`absolute inset-0 flex flex-col ${darkMode ? "bg-[#0e1825]" : "bg-gradient-to-b from-sky-50/80 to-white"}`}>
                {/* 상단 바 */}
                <div className={`flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Wave <span className="tabular-nums">{wave}</span>
                    </div>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Score: <span className="tabular-nums">{score}</span>
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md ${
                        difficulty === "easy" ? "bg-emerald-500/20 text-emerald-400"
                        : difficulty === "normal" ? "bg-sky-500/20 text-sky-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}>
                        {difficulty === "easy" ? "Easy" : difficulty === "normal" ? "Normal" : "Hard"}
                    </span>
                    <div className={`text-sm sm:text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>
                        {"❤️".repeat(Math.max(baseHp, 0))}
                        {"🖤".repeat(Math.max(config.baseHp - baseHp, 0))}
                    </div>
                </div>

                {/* 게임 필드 */}
                <div className="flex-1 relative overflow-hidden">
                    {/* 레인 가이드 */}
                    {Array.from({ length: LANE_COUNT }).map((_, i) => (
                        <div
                            key={i}
                            className={`absolute left-0 right-0 border-b ${
                                darkMode ? "border-white/[0.03]" : "border-sky-100/30"
                            }`}
                            style={{ top: `${(i + 1) * laneHeight}%` }}
                        />
                    ))}

                    {/* 기지 (우측) */}
                    <div className={`absolute right-0 top-0 bottom-0 w-8 sm:w-12 flex items-center justify-center ${
                        darkMode ? "bg-sky-500/10 border-l border-sky-500/20" : "bg-sky-50 border-l border-sky-200"
                    }`}>
                        <span className="text-lg sm:text-2xl">🏰</span>
                    </div>

                    {/* 적 */}
                    {enemies.map((enemy) => {
                        const isHighlighted = highlightedEnemy?.id === enemy.id;
                        const topPos = enemy.lane * laneHeight + laneHeight / 2;
                        return (
                            <div
                                key={enemy.id}
                                className={`absolute flex items-center transition-none ${
                                    enemy.status === "destroyed" ? "animate-enemy-destroy" : ""
                                }`}
                                style={{
                                    left: `${enemy.left}%`,
                                    top: `${topPos}%`,
                                    transform: "translate(0, -50%)",
                                }}
                            >
                                <div className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap ${
                                    enemy.type === "boss"
                                        ? isHighlighted
                                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-110"
                                            : darkMode
                                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                                : "bg-rose-50 text-rose-700 border border-rose-200"
                                        : isHighlighted
                                            ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-110"
                                            : darkMode
                                                ? "bg-white/[0.08] text-white border border-white/[0.1]"
                                                : "bg-white text-slate-700 border border-sky-200 shadow-sm"
                                } transition-all duration-100`}>
                                    {/* prefix 하이라이트 */}
                                    {isHighlighted && input.length > 0 ? (
                                        <span>
                                            <span className={enemy.type === "boss" ? "text-amber-200" : "text-emerald-300"}>
                                                {enemy.text.slice(0, input.length)}
                                            </span>
                                            {enemy.text.slice(input.length)}
                                        </span>
                                    ) : (
                                        enemy.text
                                    )}
                                    {/* 보스 HP 바 */}
                                    {enemy.type === "boss" && enemy.status === "active" && (
                                        <div className="mt-1 h-1.5 rounded-full bg-black/20 overflow-hidden">
                                            <div
                                                className="h-full bg-rose-400 rounded-full transition-all duration-200"
                                                style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 하단 입력 */}
                <div className={`p-2.5 sm:p-4 backdrop-blur-sm border-t ${
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
                        disabled={!gameStarted || isPaused || gameOver || waveCleared}
                        className={`w-full px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg rounded-xl outline-none transition-all duration-200 border-2 ${
                            darkMode
                                ? "bg-white/[0.04] text-white border-white/[0.08] focus:border-sky-500/50 focus:bg-white/[0.06]"
                                : "bg-white text-slate-800 border-sky-200/60 focus:border-sky-400"
                        } focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50`}
                        placeholder={language === "korean" ? "적의 단어를 입력하세요..." : "Type the enemy word..."}
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* 난이도 선택 */}
            {!gameStarted && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {language === "korean" ? "타이핑 디펜스" : "Typing Defense"}
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
                                const labelColors = { easy: "text-emerald-400", normal: "text-sky-400", hard: "text-rose-400" };
                                const descriptions = {
                                    easy: language === "korean" ? "느린 속도, 기지 HP 3" : "Slow speed, 3 HP",
                                    normal: language === "korean" ? "보통 속도, 기지 HP 3" : "Normal speed, 3 HP",
                                    hard: language === "korean" ? "빠른 속도, 기지 HP 3" : "Fast speed, 3 HP",
                                };
                                return (
                                    <button
                                        key={d}
                                        onClick={() => { initAudioContext(); setDifficulty(d); restartGame(d); }}
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

            {/* 웨이브 클리어 */}
            {waveCleared && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30">
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            Wave {wave} {language === "korean" ? "클리어!" : "Clear!"}
                        </h2>
                        <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Score: <span className="font-bold tabular-nums">{score}</span>
                        </p>
                        <button
                            onClick={startNextWave}
                            className="px-5 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base"
                        >
                            {language === "korean" ? "다음 웨이브" : "Next Wave"}
                        </button>
                    </div>
                </div>
            )}

            {/* 일시정지 */}
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
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            Game Over!
                        </h2>

                        <div className={`border-t border-b py-3 my-3 ${darkMode ? "border-white/10" : "border-slate-200"}`}>
                            <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                                Score: <span className="font-bold tabular-nums">{score.toLocaleString()}</span>
                            </p>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Wave {wave} reached
                            </p>
                        </div>

                        <div className={`text-sm space-y-1.5 mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <p>{language === "korean" ? "처치한 적" : "Enemies destroyed"}: <span className="font-medium tabular-nums">{enemiesDestroyedRef.current}{language === "korean" ? "마리" : ""}</span></p>
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

export default TypingDefenseGame;
