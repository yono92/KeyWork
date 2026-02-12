import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import quotesData from "../data/quotes.json";

type SoundType = "correct" | "wrong" | "win" | "lose" | "roundComplete" | "countdown" | "go";

const DIFFICULTY_CONFIG = {
    easy:   { aiWpm: 40, totalRounds: 5 },
    normal: { aiWpm: 60, totalRounds: 5 },
    hard:   { aiWpm: 80, totalRounds: 5 },
} as const;

const TypingRaceGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const language = useTypingStore((s) => s.language);
    const isMuted = useTypingStore((s) => s.isMuted);
    const difficulty = useTypingStore((s) => s.difficulty);
    const setDifficulty = useTypingStore((s) => s.setDifficulty);

    const config = DIFFICULTY_CONFIG[difficulty];

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [countdown, setCountdown] = useState(0); // 3-2-1 카운트다운

    const [playerScore, setPlayerScore] = useState(0);
    const [aiScore, setAiScore] = useState(0);
    const [round, setRound] = useState(1);
    const [sentence, setSentence] = useState("");
    const [input, setInput] = useState("");
    const [aiProgress, setAiProgress] = useState(0); // 0~100%
    const [playerWpm, setPlayerWpm] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const isComposingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const roundStartTimeRef = useRef(Date.now());
    const playerCharsTypedRef = useRef(0);
    const usedIndicesRef = useRef<Set<number>>(new Set());
    const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 통계
    const totalCharsRef = useRef(0);
    const totalCorrectRef = useRef(0);
    const gameStartTimeRef = useRef(Date.now());

    // 유저 제스처로 AudioContext 초기화
    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
    }, []);

    // 유저 제스처 리스너
    useEffect(() => {
        const handler = () => initAudioContext();
        window.addEventListener("click", handler, { once: true });
        window.addEventListener("keydown", handler, { once: true });
        return () => {
            window.removeEventListener("click", handler);
            window.removeEventListener("keydown", handler);
        };
    }, [initAudioContext]);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;
        if (!audioContextRef.current) return;
        try {
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") ctx.resume();
            const now = ctx.currentTime;

            switch (type) {
                case "correct": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(660, now);
                    osc.frequency.linearRampToValueAtTime(880, now + 0.08);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.08);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.08);
                    break;
                }
                case "wrong": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(200, now);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.15);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.15);
                    break;
                }
                case "roundComplete": {
                    for (let i = 0; i < 3; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "sine";
                        const offset = i * 0.08;
                        osc.frequency.setValueAtTime(440 + i * 220, now + offset);
                        gain.gain.setValueAtTime(0.12, now + offset);
                        gain.gain.linearRampToValueAtTime(0, now + offset + 0.08);
                        osc.connect(gain).connect(ctx.destination);
                        osc.start(now + offset); osc.stop(now + offset + 0.08);
                    }
                    break;
                }
                case "win": {
                    for (let i = 0; i < 4; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "sine";
                        const offset = i * 0.12;
                        osc.frequency.setValueAtTime(523 + i * 130, now + offset);
                        gain.gain.setValueAtTime(0.15, now + offset);
                        gain.gain.linearRampToValueAtTime(0, now + offset + 0.12);
                        osc.connect(gain).connect(ctx.destination);
                        osc.start(now + offset); osc.stop(now + offset + 0.12);
                    }
                    break;
                }
                case "lose": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.linearRampToValueAtTime(220, now + 0.3);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.4);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.4);
                    break;
                }
                case "countdown": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, now);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.15);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.15);
                    break;
                }
                case "go": {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(880, now);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.2);
                    break;
                }
            }
        } catch { /* ignore */ }
    }, [isMuted]);

    const getRandomSentence = useCallback((): string => {
        const sentences = quotesData[language];
        const available = sentences.filter((_, i) => !usedIndicesRef.current.has(i));
        const pool = available.length > 0 ? available : sentences;
        const idx = sentences.indexOf(pool[Math.floor(Math.random() * pool.length)]);
        usedIndicesRef.current.add(idx);
        return sentences[idx];
    }, [language]);

    const startRound = useCallback(() => {
        const s = getRandomSentence();
        setSentence(s);
        setInput("");
        setAiProgress(0);
        roundStartTimeRef.current = Date.now();
        playerCharsTypedRef.current = 0;
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
        }
    }, [getRandomSentence]);

    // 카운트다운 로직
    useEffect(() => {
        if (countdown <= 0) return;

        if (countdown === 1) {
            // GO! → 실제 게임 시작
            playSound("go");
            const timer = setTimeout(() => {
                setCountdown(0);
                roundStartTimeRef.current = Date.now();
            }, 600);
            return () => clearTimeout(timer);
        }

        playSound("countdown");
        const timer = setTimeout(() => {
            setCountdown((c) => c - 1);
        }, 800);
        return () => clearTimeout(timer);
    }, [countdown, playSound]);

    // AI 진행 루프
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused || !sentence || countdown > 0) return;

        // AI WPM → chars/ms (1 word ≈ 5 chars)
        const charsPerMs = (config.aiWpm * 5) / 60000;
        const totalChars = sentence.length;

        aiIntervalRef.current = setInterval(() => {
            setAiProgress(() => {
                const elapsed = Date.now() - roundStartTimeRef.current;
                const aiChars = charsPerMs * elapsed;
                const pct = Math.min((aiChars / totalChars) * 100, 100);
                return pct;
            });
        }, 50);

        return () => {
            if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        };
    }, [gameStarted, gameOver, isPaused, sentence, config.aiWpm, countdown]);

    // AI가 100% 도달 시
    useEffect(() => {
        if (aiProgress >= 100 && gameStarted && !gameOver) {
            setAiScore((prev) => {
                const newScore = prev + 1;
                if (newScore >= config.totalRounds) {
                    setGameOver(true);
                    playSound("lose");
                } else {
                    setRound((r) => r + 1);
                    playSound("wrong");
                    setTimeout(() => startRound(), 500);
                }
                return newScore;
            });
            setAiProgress(0); // 리셋해서 중복 트리거 방지
        }
    }, [aiProgress, gameStarted, gameOver]);

    // 플레이어 WPM 계산
    useEffect(() => {
        if (!gameStarted || gameOver || isPaused) return;
        const interval = setInterval(() => {
            const elapsed = (Date.now() - roundStartTimeRef.current) / 60000;
            if (elapsed > 0 && playerCharsTypedRef.current > 0) {
                setPlayerWpm(Math.round((playerCharsTypedRef.current / 5) / elapsed));
            }
        }, 500);
        return () => clearInterval(interval);
    }, [gameStarted, gameOver, isPaused]);

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

    // 일시정지 해제/카운트다운 종료 시 포커스
    useEffect(() => {
        if (!isPaused && !gameOver && countdown === 0 && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver, countdown]);

    const getCorrectChars = (text: string, userInput: string): number => {
        let count = 0;
        for (let i = 0; i < userInput.length && i < text.length; i++) {
            if (userInput[i] === text[i]) count++;
            else break;
        }
        return count;
    };

    const playerProgress = sentence.length > 0
        ? (getCorrectChars(sentence, input) / sentence.length) * 100
        : 0;

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        playerCharsTypedRef.current = val.length;
        totalCharsRef.current++;

        // 플레이어가 문장 완료
        if (val === sentence) {
            // AI 진행 즉시 중지
            if (aiIntervalRef.current) {
                clearInterval(aiIntervalRef.current);
                aiIntervalRef.current = null;
            }
            setAiProgress(0);

            totalCorrectRef.current += sentence.length;
            playSound("roundComplete");
            setPlayerScore((prev) => {
                const newScore = prev + 1;
                if (newScore >= config.totalRounds) {
                    setGameOver(true);
                    setTimeout(() => playSound("win"), 100);
                } else {
                    setRound((r) => r + 1);
                    setTimeout(() => startRound(), 500);
                }
                return newScore;
            });
        }
    };

    const handleCompositionStart = () => { isComposingRef.current = true; };
    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposingRef.current = false;
        setInput((e.target as HTMLInputElement).value);
    };

    const restartGame = (overrideDifficulty?: keyof typeof DIFFICULTY_CONFIG, resetCountdown = true) => {
        if (overrideDifficulty) setDifficulty(overrideDifficulty);
        setPlayerScore(0);
        setAiScore(0);
        setRound(1);
        setGameOver(false);
        setIsPaused(false);
        setInput("");
        setAiProgress(0);
        setPlayerWpm(0);
        usedIndicesRef.current.clear();
        totalCharsRef.current = 0;
        totalCorrectRef.current = 0;
        gameStartTimeRef.current = Date.now();
        playerCharsTypedRef.current = 0;
        if (inputRef.current) {
            inputRef.current.value = "";
        }

        if (resetCountdown) {
            setGameStarted(true);
            // 문장 미리 세팅 + 카운트다운 시작
            const s = quotesData[language][Math.floor(Math.random() * quotesData[language].length)];
            setSentence(s);
            setCountdown(3);
        }
    };

    const aiWpm = config.aiWpm;
    const playerWon = playerScore >= config.totalRounds;
    const formatPlayTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}분 ${sec.toString().padStart(2, "0")}초`;
    };

    return (
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10">
            <div className={`absolute inset-0 flex flex-col ${darkMode ? "bg-[#0e1825]" : "bg-gradient-to-b from-sky-50/80 to-white"}`}>
                {/* 상단 스코어바 */}
                <div className={`flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        <span className="text-sky-400">Player</span> {playerScore}
                        <span className="mx-1.5 sm:mx-3 text-slate-400">vs</span>
                        <span className="text-rose-400">AI</span> {aiScore}
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md ${
                        difficulty === "easy" ? "bg-emerald-500/20 text-emerald-400"
                        : difficulty === "normal" ? "bg-sky-500/20 text-sky-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}>
                        {difficulty === "easy" ? "Easy" : difficulty === "normal" ? "Normal" : "Hard"}
                    </span>
                    <div className={`text-xs sm:text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        Round {round}/{config.totalRounds}
                    </div>
                </div>

                {/* 레이스 트랙 영역 */}
                <div className="flex-1 flex flex-col justify-center px-3 gap-3 sm:px-6 sm:gap-6">
                    {/* 플레이어 트랙 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${darkMode ? "text-sky-300" : "text-sky-600"}`}>
                                Player
                            </span>
                            <span className={`text-xs tabular-nums ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                {playerWpm} WPM
                            </span>
                        </div>
                        <div className={`relative h-7 sm:h-10 rounded-xl overflow-hidden ${darkMode ? "bg-white/[0.06]" : "bg-sky-50 border border-sky-100"}`}>
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-cyan-400 rounded-xl transition-all duration-150 ease-out"
                                style={{ width: `${Math.min(playerProgress, 100)}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 text-xl transition-all duration-150 ease-out"
                                style={{ left: `calc(${Math.min(playerProgress, 97)}% - 10px)` }}
                            >
                                🏃
                            </div>
                        </div>
                    </div>

                    {/* AI 트랙 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${darkMode ? "text-rose-300" : "text-rose-600"}`}>
                                AI
                            </span>
                            <span className={`text-xs tabular-nums ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                {aiWpm} WPM
                            </span>
                        </div>
                        <div className={`relative h-7 sm:h-10 rounded-xl overflow-hidden ${darkMode ? "bg-white/[0.06]" : "bg-rose-50 border border-rose-100"}`}>
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-pink-400 rounded-xl transition-all duration-150 ease-out"
                                style={{ width: `${Math.min(aiProgress, 100)}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 text-xl transition-all duration-150 ease-out"
                                style={{ left: `calc(${Math.min(aiProgress, 97)}% - 10px)` }}
                            >
                                🤖
                            </div>
                        </div>
                    </div>

                    {/* 문장 표시 */}
                    {sentence && (
                        <div className={`p-4 rounded-xl border ${darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-sky-100"}`}>
                            <p className="text-sm sm:text-lg leading-relaxed font-mono tracking-wide">
                                {sentence.split("").map((char, idx) => {
                                    let className = darkMode ? "text-slate-500" : "text-slate-400";
                                    if (idx < input.length) {
                                        className = input[idx] === char
                                            ? "text-emerald-500"
                                            : "text-rose-500 underline decoration-rose-400/50";
                                    }
                                    return <span key={idx} className={className}>{char}</span>;
                                })}
                            </p>
                        </div>
                    )}
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
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        disabled={!gameStarted || isPaused || gameOver || countdown > 0}
                        className={`w-full px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg rounded-xl outline-none transition-all duration-200 border-2 ${
                            darkMode
                                ? "bg-white/[0.04] text-white border-white/[0.08] focus:border-sky-500/50 focus:bg-white/[0.06]"
                                : "bg-white text-slate-800 border-sky-200/60 focus:border-sky-400"
                        } focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50`}
                        placeholder={countdown > 0 ? "" : (language === "korean" ? "문장을 입력하세요..." : "Type the sentence...")}
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
                            {language === "korean" ? "타이핑 레이스" : "Typing Race"}
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
                                    easy: language === "korean" ? `AI 속도: ${DIFFICULTY_CONFIG.easy.aiWpm} WPM` : `AI speed: ${DIFFICULTY_CONFIG.easy.aiWpm} WPM`,
                                    normal: language === "korean" ? `AI 속도: ${DIFFICULTY_CONFIG.normal.aiWpm} WPM` : `AI speed: ${DIFFICULTY_CONFIG.normal.aiWpm} WPM`,
                                    hard: language === "korean" ? `AI 속도: ${DIFFICULTY_CONFIG.hard.aiWpm} WPM` : `AI speed: ${DIFFICULTY_CONFIG.hard.aiWpm} WPM`,
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

            {/* 카운트다운 오버레이 */}
            {countdown > 0 && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30">
                    <div className="text-center animate-panel-in">
                        <div className={`text-5xl sm:text-8xl font-black tabular-nums ${countdown === 1 ? "text-emerald-400" : "text-white"}`}
                            key={countdown}
                            style={{ animation: "countdownPop 0.6s ease-out" }}
                        >
                            {countdown === 1 ? (language === "korean" ? "GO!" : "GO!") : countdown - 1}
                        </div>
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
                            {playerWon
                                ? (language === "korean" ? "승리!" : "You Win!")
                                : (language === "korean" ? "패배..." : "You Lose...")}
                        </h2>
                        {playerWon && (
                            <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">🏆</p>
                        )}

                        <div className={`border-t border-b py-3 my-3 ${darkMode ? "border-white/10" : "border-slate-200"}`}>
                            <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                                <span className="text-sky-400">Player {playerScore}</span>
                                <span className="mx-2 text-slate-400">vs</span>
                                <span className="text-rose-400">AI {aiScore}</span>
                            </p>
                        </div>

                        <div className={`text-sm space-y-1.5 mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <p>{language === "korean" ? "최종 WPM" : "Final WPM"}: <span className="font-medium tabular-nums">{playerWpm}</span></p>
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
                                onClick={() => { restartGame(undefined, false); setGameStarted(false); }}
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

export default TypingRaceGame;
