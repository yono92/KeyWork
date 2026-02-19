import React, { useState, useEffect, useCallback, useRef } from "react";
import useTypingStore from "../store/store";
import proverbsData from "../data/proverbs.json";
import { calculateHangulAccuracy } from "../utils/hangulUtils";
import { getLevenshteinDistance } from "../utils/levenshtein";
import { formatPlayTime } from "../utils/formatting";
import { calculateGameXp } from "../utils/xpUtils";
import { useGameAudio } from "../hooks/useGameAudio";
import { usePauseHandler } from "../hooks/usePauseHandler";
import PauseOverlay from "./game/PauseOverlay";
import GameOverModal from "./game/GameOverModal";
import GameInput from "./game/GameInput";
import DifficultyBadge from "./game/DifficultyBadge";
import { Button } from "@/components/ui/button";

const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;

const DIFFICULTY_CONFIG = {
    easy:   { speechRate: 0.8, hasHint: true,  canReplay: true },
    normal: { speechRate: 1.0, hasHint: false, canReplay: true },
    hard:   { speechRate: 1.2, hasHint: false, canReplay: false },
} as const;

const TOTAL_ROUNDS = 10;

const DictationGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const language = useTypingStore((s) => s.language);
    const difficulty = useTypingStore((s) => s.difficulty);
    const addXp = useTypingStore((s) => s.addXp);

    const config = DIFFICULTY_CONFIG[difficulty];

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    const [round, setRound] = useState(1);
    const [sentence, setSentence] = useState("");
    const [input, setInput] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [roundAccuracy, setRoundAccuracy] = useState(0);
    const [scores, setScores] = useState<number[]>([]);
    const [showHint, setShowHint] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const usedIndicesRef = useRef<Set<number>>(new Set());
    const voicesLoadedRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());

    const { playSound } = useGameAudio();
    usePauseHandler(gameStarted, gameOver, setIsPaused);

    // 일시정지 시 음성 취소
    useEffect(() => {
        if (isPaused && hasTTS) speechSynthesis.cancel();
    }, [isPaused]);

    // 음성 목록 로드
    useEffect(() => {
        if (!hasTTS) return;
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) voicesLoadedRef.current = true;
        };
        loadVoices();
        speechSynthesis.addEventListener("voiceschanged", loadVoices);
        return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    }, []);

    const speakSentence = useCallback((text: string) => {
        if (!hasTTS) return;
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "korean" ? "ko-KR" : "en-US";
        utterance.rate = config.speechRate;

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

    // 카운트다운 타이머
    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            setCountdown(null);
            setGameStarted(true);
            gameStartTimeRef.current = Date.now();
            // 첫 라운드 시작
            setTimeout(() => {
                const s = getRandomSentence();
                startRound(s);
            }, 100);
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, getRandomSentence, startRound]);

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
            playSound("match");
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

    useEffect(() => {
        if (!isPaused && !gameOver && inputRef.current) inputRef.current.focus();
    }, [isPaused, gameOver]);

    // 언마운트 시 음성 취소
    useEffect(() => {
        return () => { if (hasTTS) speechSynthesis.cancel(); };
    }, []);

    const getHintText = (): string => {
        return sentence.split(" ").map((word) => {
            if (word.length <= 1) return word;
            return word[0] + "_".repeat(word.length - 1);
        }).join(" ");
    };

    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // 게임오버 시 XP 지급
    useEffect(() => {
        if (gameOver) addXp(calculateGameXp(avgScore * 0.3, difficulty));
    }, [gameOver, avgScore, addXp, difficulty]);

    const restartGame = () => {
        if (hasTTS) speechSynthesis.cancel();
        setRound(1);
        setGameOver(false);
        setIsPaused(false);
        setScores([]);
        setInput("");
        setSubmitted(false);
        setShowHint(false);
        usedIndicesRef.current.clear();
        setCountdown(3);
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
                    <DifficultyBadge difficulty={difficulty} />
                    <div className={`text-xs sm:text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        <span className="hidden sm:inline">{language === "korean" ? "평균 정확도" : "Avg Accuracy"}: </span><span className="font-bold tabular-nums">{avgScore}%</span>
                    </div>
                </div>

                {/* 메인 영역 */}
                <div className="flex-1 flex flex-col items-center justify-center px-3 gap-4 sm:px-6 sm:gap-6">
                    {/* 재생 버튼 */}
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => speakSentence(sentence)}
                            disabled={isPaused || submitted || (!config.canReplay && isSpeaking)}
                            variant="ghost"
                            className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full text-2xl sm:text-4xl transition-all duration-200 ${
                                isSpeaking
                                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-110"
                                    : darkMode
                                        ? "bg-white/[0.06] hover:bg-white/[0.1] text-white"
                                        : "bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200"
                            } disabled:opacity-50`}
                        >
                            🔊
                        </Button>

                        {config.hasHint && !submitted && (
                            <Button
                                onClick={() => setShowHint((h) => !h)}
                                variant="outline"
                                className={`h-auto px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    darkMode
                                        ? "bg-white/[0.06] border-white/10 hover:bg-white/[0.1] text-amber-300"
                                        : "bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200"
                                }`}
                            >
                                💡 {language === "korean" ? "힌트" : "Hint"}
                            </Button>
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
                                <Button
                                    onClick={handleNextRound}
                                    variant="secondary"
                                    className={`ml-4 h-auto px-6 py-2 text-sm font-medium ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                                >
                                    {round >= TOTAL_ROUNDS
                                        ? (language === "korean" ? "결과 보기" : "See Results")
                                        : (language === "korean" ? "다음 문제" : "Next")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 하단 입력 */}
                <div className={`p-2.5 sm:p-4 backdrop-blur-sm border-t ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className="flex gap-2 sm:gap-3">
                        <GameInput
                            inputRef={inputRef}
                            value={input}
                            onChange={setInput}
                            onSubmit={!submitted ? handleSubmit : handleNextRound}
                            disabled={!gameStarted || isPaused || gameOver || submitted}
                            placeholder={language === "korean" ? "들은 문장을 입력하세요…" : "Type what you heard…"}
                            ariaLabel={language === "korean" ? "받아쓰기 입력" : "Dictation input"}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSubmit}
                            disabled={!gameStarted || isPaused || gameOver || submitted || !input.trim()}
                            variant="secondary"
                            className={`h-auto px-4 py-2 sm:px-6 sm:py-3 font-medium text-sm sm:text-base disabled:opacity-50 ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                        >
                            {language === "korean" ? "제출" : "Submit"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* 시작 오버레이 */}
            {!gameStarted && !gameOver && countdown === null && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-4xl font-black text-white mb-2">
                            {language === "korean" ? "받아쓰기" : "Dictation"}
                        </h2>
                        <p className={`text-sm sm:text-base mb-6 ${darkMode ? "text-slate-300" : "text-slate-200"}`}>
                            {language === "korean"
                                ? "음성을 듣고 문장을 정확히 입력하세요"
                                : "Listen and type the sentence accurately"}
                        </p>
                        <Button
                            onClick={() => restartGame()}
                            variant="secondary"
                            className={`h-auto px-8 py-3 font-bold text-lg ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
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

            {/* 일시정지 */}
            {isPaused && !gameOver && <PauseOverlay language={language} />}

            {/* 게임 오버 */}
            {gameOver && (
                <GameOverModal
                    title={language === "korean" ? "결과" : "Results"}
                    badge={
                        avgScore >= 90 ? (
                            <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">🏆 {language === "korean" ? "우수!" : "Excellent!"}</p>
                        ) : undefined
                    }
                    primaryStat={
                        <>
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
                        </>
                    }
                    stats={[
                        {
                            label: language === "korean" ? "만점 라운드" : "Perfect rounds",
                            value: `${scores.filter((s) => s === 100).length}/${TOTAL_ROUNDS}`,
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
                >
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
                </GameOverModal>
            )}
        </div>
    );
};

export default DictationGame;
