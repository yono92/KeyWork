import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import proverbsData from "../data/proverbs.json";
import { calculateHangulAccuracy } from "../utils/hangulUtils";
import { getLevenshteinDistance } from "../utils/levenshtein";

type SoundType = "submit" | "perfect" | "gameOver";

const DIFFICULTY_CONFIG = {
    easy:   { speechRate: 0.8, hasHint: true,  canReplay: true },
    normal: { speechRate: 1.0, hasHint: false, canReplay: true },
    hard:   { speechRate: 1.2, hasHint: false, canReplay: false },
} as const;

const TOTAL_ROUNDS = 10;

const DictationGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const language = useTypingStore((s) => s.language);
    const isMuted = useTypingStore((s) => s.isMuted);
    const difficulty = useTypingStore((s) => s.difficulty);
    const setDifficulty = useTypingStore((s) => s.setDifficulty);

    const config = DIFFICULTY_CONFIG[difficulty];

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [round, setRound] = useState(1);
    const [sentence, setSentence] = useState("");
    const [input, setInput] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [roundAccuracy, setRoundAccuracy] = useState(0);
    const [scores, setScores] = useState<number[]>([]);
    const [showHint, setShowHint] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const isComposingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const usedIndicesRef = useRef<Set<number>>(new Set());
    const voicesLoadedRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());

    // 음성 목록 로드
    useEffect(() => {
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) voicesLoadedRef.current = true;
        };
        loadVoices();
        speechSynthesis.addEventListener("voiceschanged", loadVoices);
        return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    }, []);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;
        try {
            if (!audioContextRef.current) audioContextRef.current = new AudioContext();
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") ctx.resume();
            const now = ctx.currentTime;

            switch (type) {
                case "submit": {
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
                case "perfect": {
                    for (let i = 0; i < 3; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = "sine";
                        const offset = i * 0.1;
                        osc.frequency.setValueAtTime(523 + i * 130, now + offset);
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
                    osc.frequency.linearRampToValueAtTime(330, now + 0.3);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.4);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now); osc.stop(now + 0.4);
                    break;
                }
            }
        } catch { /* ignore */ }
    }, [isMuted]);

    const speakSentence = useCallback((text: string) => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "korean" ? "ko-KR" : "en-US";
        utterance.rate = config.speechRate;

        // 적절한 voice 선택
        const voices = speechSynthesis.getVoices();
        const langCode = language === "korean" ? "ko" : "en";
        const voice = voices.find((v) => v.lang.startsWith(langCode));
        if (voice) utterance.voice = voice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
    }, [language, config.speechRate]);

    const getRandomSentence = useCallback((): string => {
        const sentences = proverbsData[language];
        const available = sentences.filter((_, i) => !usedIndicesRef.current.has(i));
        const pool = available.length > 0 ? available : sentences;
        const idx = sentences.indexOf(pool[Math.floor(Math.random() * pool.length)]);
        usedIndicesRef.current.add(idx);
        return sentences[idx];
    }, [language]);

    const startRound = useCallback((newSentence?: string) => {
        const s = newSentence ?? getRandomSentence();
        setSentence(s);
        setInput("");
        setSubmitted(false);
        setRoundAccuracy(0);
        setShowHint(false);
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
        }
        // 자동 재생
        setTimeout(() => speakSentence(s), 300);
    }, [getRandomSentence, speakSentence]);

    const calculateAccuracy = (target: string, userInput: string): number => {
        if (!userInput.trim()) return 0;
        if (language === "korean") {
            return calculateHangulAccuracy(target, userInput);
        }
        // 영어: Levenshtein 기반
        const targetArr = target.split("");
        const inputArr = userInput.split("");
        const distance = getLevenshteinDistance(targetArr, inputArr);
        return Math.max(0, Math.round(((targetArr.length - distance) / targetArr.length) * 100));
    };

    const handleSubmit = () => {
        if (submitted || !input.trim()) return;

        const accuracy = calculateAccuracy(sentence, input.trim());
        setRoundAccuracy(accuracy);
        setSubmitted(true);

        if (accuracy === 100) {
            playSound("perfect");
        } else {
            playSound("submit");
        }

        setScores((prev) => [...prev, accuracy]);
    };

    const handleNextRound = () => {
        if (round >= TOTAL_ROUNDS) {
            setGameOver(true);
            playSound("gameOver");
            return;
        }
        setRound((r) => r + 1);
        startRound();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !isComposingRef.current && !e.nativeEvent.isComposing) {
            if (!submitted) {
                handleSubmit();
            } else {
                handleNextRound();
            }
        }
    };

    const handleCompositionStart = () => { isComposingRef.current = true; };
    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposingRef.current = false;
        setInput((e.target as HTMLInputElement).value);
    };

    // ESC 일시정지
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && gameStarted && !gameOver) {
                setIsPaused((p) => !p);
                if (!isPaused) speechSynthesis.cancel();
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [gameStarted, gameOver, isPaused]);

    useEffect(() => {
        if (!isPaused && !gameOver && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver]);

    // 언마운트 시 음성 취소
    useEffect(() => {
        return () => { speechSynthesis.cancel(); };
    }, []);

    const getHintText = (): string => {
        return sentence.split(" ").map((word) => {
            if (word.length <= 1) return word;
            return word[0] + "_".repeat(word.length - 1);
        }).join(" ");
    };

    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const restartGame = (overrideDifficulty?: keyof typeof DIFFICULTY_CONFIG) => {
        if (overrideDifficulty) setDifficulty(overrideDifficulty);
        speechSynthesis.cancel();
        setRound(1);
        setGameOver(false);
        setGameStarted(true);
        setIsPaused(false);
        setScores([]);
        setInput("");
        setSubmitted(false);
        setShowHint(false);
        usedIndicesRef.current.clear();
        gameStartTimeRef.current = Date.now();

        setTimeout(() => {
            const s = getRandomSentence();
            startRound(s);
        }, 100);
    };

    const formatPlayTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}분 ${sec.toString().padStart(2, "0")}초`;
    };

    return (
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10">
            <div className={`absolute inset-0 flex flex-col ${darkMode ? "bg-[#0e1825]" : "bg-gradient-to-b from-sky-50/80 to-white"}`}>
                {/* 상단 바 */}
                <div className={`flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Round <span className="tabular-nums">{round}</span>/{TOTAL_ROUNDS}
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md ${
                        difficulty === "easy" ? "bg-emerald-500/20 text-emerald-400"
                        : difficulty === "normal" ? "bg-sky-500/20 text-sky-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}>
                        {difficulty === "easy" ? "Easy" : difficulty === "normal" ? "Normal" : "Hard"}
                    </span>
                    <div className={`text-xs sm:text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        <span className="hidden sm:inline">{language === "korean" ? "평균 정확도" : "Avg Accuracy"}: </span><span className="font-bold tabular-nums">{avgScore}%</span>
                    </div>
                </div>

                {/* 메인 영역 */}
                <div className="flex-1 flex flex-col items-center justify-center px-3 gap-4 sm:px-6 sm:gap-6">
                    {/* 재생 버튼 */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => speakSentence(sentence)}
                            disabled={isPaused || submitted || (!config.canReplay && isSpeaking)}
                            className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-4xl transition-all duration-200 ${
                                isSpeaking
                                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-110"
                                    : darkMode
                                        ? "bg-white/[0.06] hover:bg-white/[0.1] text-white"
                                        : "bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200"
                            } disabled:opacity-50`}
                        >
                            🔊
                        </button>

                        {config.hasHint && !submitted && (
                            <button
                                onClick={() => setShowHint((h) => !h)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    darkMode
                                        ? "bg-white/[0.06] hover:bg-white/[0.1] text-amber-300"
                                        : "bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200"
                                }`}
                            >
                                💡 {language === "korean" ? "힌트" : "Hint"}
                            </button>
                        )}

                        {!config.canReplay && (
                            <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                {language === "korean" ? "(다시 듣기 불가)" : "(No replay)"}
                            </span>
                        )}
                    </div>

                    {/* 힌트 표시 */}
                    {showHint && !submitted && (
                        <div className={`text-sm sm:text-lg font-mono tracking-widest ${darkMode ? "text-amber-300/70" : "text-amber-600/70"}`}>
                            {getHintText()}
                        </div>
                    )}

                    {/* 제출 후 비교 */}
                    {submitted && (
                        <div className={`w-full max-w-sm sm:max-w-2xl space-y-2 sm:space-y-3 animate-panel-in`}>
                            <div className={`p-4 rounded-xl border ${
                                roundAccuracy === 100
                                    ? darkMode ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
                                    : darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-sky-100"
                            }`}>
                                <div className={`text-xs font-medium mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {language === "korean" ? "정답" : "Answer"}
                                </div>
                                <p className={`text-sm sm:text-lg ${darkMode ? "text-emerald-300" : "text-emerald-700"}`}>{sentence}</p>
                            </div>
                            <div className={`p-4 rounded-xl border ${darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-sky-100"}`}>
                                <div className={`text-xs font-medium mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {language === "korean" ? "내 답변" : "Your answer"}
                                </div>
                                <p className={`text-sm sm:text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>{input}</p>
                            </div>
                            <div className="text-center">
                                <span className={`text-2xl font-bold ${
                                    roundAccuracy >= 90 ? "text-emerald-400"
                                    : roundAccuracy >= 70 ? "text-sky-400"
                                    : roundAccuracy >= 50 ? "text-amber-400"
                                    : "text-rose-400"
                                }`}>
                                    {roundAccuracy}%
                                </span>
                                <button
                                    onClick={handleNextRound}
                                    className="ml-4 px-6 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
                                >
                                    {round >= TOTAL_ROUNDS
                                        ? (language === "korean" ? "결과 보기" : "See Results")
                                        : (language === "korean" ? "다음 문제" : "Next")}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 하단 입력 */}
                <div className={`p-2.5 sm:p-4 backdrop-blur-sm border-t ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className="flex gap-2 sm:gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={handleCompositionEnd}
                            disabled={!gameStarted || isPaused || gameOver || submitted}
                            className={`flex-1 px-3 py-2 text-base sm:px-4 sm:py-3 sm:text-lg rounded-xl outline-none transition-all duration-200 border-2 ${
                                darkMode
                                    ? "bg-white/[0.04] text-white border-white/[0.08] focus:border-sky-500/50 focus:bg-white/[0.06]"
                                    : "bg-white text-slate-800 border-sky-200/60 focus:border-sky-400"
                            } focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50`}
                            placeholder={language === "korean" ? "들은 문장을 입력하세요..." : "Type what you heard..."}
                            autoComplete="off"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!gameStarted || isPaused || gameOver || submitted || !input.trim()}
                            className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-50"
                        >
                            {language === "korean" ? "제출" : "Submit"}
                        </button>
                    </div>
                </div>
            </div>

            {/* 난이도 선택 */}
            {!gameStarted && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                    <div className={`text-center px-5 py-5 sm:px-10 sm:py-8 rounded-2xl border animate-panel-in ${
                        darkMode ? "bg-[#162032] border-white/10" : "bg-white border-sky-100"
                    } shadow-2xl w-full max-w-xs sm:max-w-sm mx-4`}>
                        <h2 className={`text-xl sm:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {language === "korean" ? "받아쓰기" : "Dictation"}
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
                                    easy: language === "korean" ? "느린 음성, 힌트 제공, 다시 듣기" : "Slow speech, hints, replay",
                                    normal: language === "korean" ? "보통 음성, 다시 듣기" : "Normal speech, replay",
                                    hard: language === "korean" ? "빠른 음성, 다시 듣기 불가" : "Fast speech, no replay",
                                };
                                return (
                                    <button
                                        key={d}
                                        onClick={() => { setDifficulty(d); restartGame(d); }}
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
                            {language === "korean" ? "결과" : "Results"}
                        </h2>
                        {avgScore >= 90 && (
                            <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">🏆 {language === "korean" ? "우수!" : "Excellent!"}</p>
                        )}

                        <div className={`border-t border-b py-3 my-3 ${darkMode ? "border-white/10" : "border-slate-200"}`}>
                            <p className={`text-3xl font-bold mb-1 ${
                                avgScore >= 90 ? "text-emerald-400"
                                : avgScore >= 70 ? "text-sky-400"
                                : avgScore >= 50 ? "text-amber-400"
                                : "text-rose-400"
                            }`}>
                                {avgScore}%
                            </p>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                {language === "korean" ? "평균 정확도" : "Average accuracy"}
                            </p>
                        </div>

                        <div className={`text-sm space-y-1.5 mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <p>{language === "korean" ? "만점 라운드" : "Perfect rounds"}: <span className="font-medium tabular-nums">{scores.filter((s) => s === 100).length}/{TOTAL_ROUNDS}</span></p>
                            <p>{language === "korean" ? "플레이 시간" : "Play time"}: <span className="font-medium tabular-nums">{formatPlayTime(Date.now() - gameStartTimeRef.current)}</span></p>
                        </div>

                        {/* 라운드별 점수 */}
                        <div className="flex gap-1 justify-center mb-5">
                            {scores.map((s, i) => (
                                <div
                                    key={i}
                                    className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center ${
                                        s === 100 ? "bg-emerald-500/20 text-emerald-400"
                                        : s >= 70 ? "bg-sky-500/20 text-sky-400"
                                        : s >= 50 ? "bg-amber-500/20 text-amber-400"
                                        : "bg-rose-500/20 text-rose-400"
                                    }`}
                                >
                                    {s}
                                </div>
                            ))}
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

export default DictationGame;
