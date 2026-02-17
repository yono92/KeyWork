import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useTypingStore from "../store/store";
import wordsData from "../data/word.json";
import proverbsData from "../data/proverbs.json";
import { formatPlayTime } from "../utils/formatting";
import { calculateGameXp } from "../utils/xpUtils";
import { useGameAudio } from "../hooks/useGameAudio";
import { usePauseHandler } from "../hooks/usePauseHandler";
import PauseOverlay from "./game/PauseOverlay";
import GameOverModal from "./game/GameOverModal";
import DifficultySelector from "./game/DifficultySelector";
import GameInput from "./game/GameInput";

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
    const difficulty = useTypingStore((s) => s.difficulty);
    const setDifficulty = useTypingStore((s) => s.setDifficulty);
    const addXp = useTypingStore((s) => s.addXp);

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
    const gameStartTimeRef = useRef(Date.now());
    const enemiesDestroyedRef = useRef(0);
    const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const waveRef = useRef(1);

    const { playSound } = useGameAudio();
    usePauseHandler(gameStarted, gameOver, setIsPaused);

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
                    for (let i = 0; i < hitsInTick; i++) playSound("lifeLost");
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

    // 게임오버 시 XP 지급
    useEffect(() => {
        if (gameOver) addXp(calculateGameXp(score / 20, difficulty));
    }, [gameOver, score, addXp, difficulty]);

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
            playSound("levelUp");
        }
    }, [totalSpawned, waveEnemiesLeft, wave, gameStarted, gameOver, waveCleared, getWaveConfig, playSound]);

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

    const handleSubmit = () => {
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
                    <GameInput
                        inputRef={inputRef}
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSubmit}
                        disabled={!gameStarted || isPaused || gameOver || waveCleared}
                        placeholder={language === "korean" ? "적의 단어를 입력하세요..." : "Type the enemy word..."}
                    />
                </div>
            </div>

            {/* 난이도 선택 */}
            {!gameStarted && !gameOver && (
                <DifficultySelector
                    title={language === "korean" ? "타이핑 디펜스" : "Typing Defense"}
                    subtitle={language === "korean" ? "난이도를 선택하세요" : "Select difficulty"}
                    descriptions={{
                        easy: language === "korean" ? "느린 속도, 기지 HP 3" : "Slow speed, 3 HP",
                        normal: language === "korean" ? "보통 속도, 기지 HP 3" : "Normal speed, 3 HP",
                        hard: language === "korean" ? "빠른 속도, 기지 HP 3" : "Fast speed, 3 HP",
                    }}
                    onSelect={(d) => { setDifficulty(d); restartGame(d); }}
                />
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
            {isPaused && !gameOver && <PauseOverlay language={language} />}

            {/* 게임 오버 */}
            {gameOver && (
                <GameOverModal
                    title="Game Over!"
                    primaryStat={
                        <>
                            <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                                Score: <span className="font-bold tabular-nums">{score.toLocaleString()}</span>
                            </p>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Wave {wave} reached
                            </p>
                        </>
                    }
                    stats={[
                        {
                            label: language === "korean" ? "처치한 적" : "Enemies destroyed",
                            value: `${enemiesDestroyedRef.current}${language === "korean" ? "마리" : ""}`,
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
                        {
                            label: language === "korean" ? "난이도 변경" : "Change Difficulty",
                            onClick: () => { restartGame(); setGameStarted(false); },
                        },
                    ]}
                />
            )}
        </div>
    );
};

export default TypingDefenseGame;
