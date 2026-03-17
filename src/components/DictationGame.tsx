"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import useTypingStore from "../store/store";
import { useDictationEngine, type DiffChar } from "../hooks/useDictationEngine";
import { useGameAudio } from "../hooks/useGameAudio";
import { useScoreSubmit } from "../hooks/useScoreSubmit";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import DifficultySelector from "./game/DifficultySelector";
import GameOverModal from "./game/GameOverModal";
import GameInput from "./game/GameInput";
import AchievementUnlockBadge from "./game/AchievementUnlockBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const DictationGame: React.FC = () => {
    const language = useTypingStore((s) => s.language);
    const difficulty = useTypingStore((s) => s.difficulty);
    const setDifficulty = useTypingStore((s) => s.setDifficulty);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const ko = language === "korean";

    const {
        phase,
        questionIndex,
        totalQuestions,
        currentSentence,
        currentDiff,
        currentAccuracy,
        isSpeaking,
        playsRemaining,
        showFallback,
        results,
        finalScore,
        averageAccuracy,
        perfectCount,
        startGame,
        playSentence,
        gradeAnswer,
        nextQuestion,
        restart,
        backToMenu,
    } = useDictationEngine(language);

    const { playSound } = useGameAudio();
    const { submitScore, isLoggedIn } = useScoreSubmit();
    const { checkAchievements, newlyUnlocked } = useAchievementChecker();

    const [input, setInput] = useState("");
    const [scoreSubmitted, setScoreSubmitted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 문제 시작 시 포커스 + 입력 초기화
    useEffect(() => {
        if (phase === "playing") {
            setInput("");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [phase, questionIndex]);

    // 게임 완료 시 점수 제출 + 업적 검사
    useEffect(() => {
        if (phase === "finished" && !scoreSubmitted) {
            playSound("roundComplete");
            setScoreSubmitted(true);
            const scoreData = {
                game_mode: "dictation",
                score: finalScore,
                accuracy: averageAccuracy,
            };
            if (isLoggedIn) {
                void submitScore(scoreData).then(() => checkAchievements(scoreData));
            }
        }
    }, [phase, scoreSubmitted, isLoggedIn, submitScore, finalScore, averageAccuracy, playSound, checkAchievements]);

    // ── 제출 ──
    const handleSubmit = useCallback(() => {
        if (phase !== "playing" || !input.trim()) return;
        const { accuracy } = gradeAnswer(input);
        if (accuracy === 100) {
            playSound("perfect");
        } else if (accuracy >= 80) {
            playSound("match");
        } else {
            playSound("wrong");
        }
    }, [phase, input, gradeAnswer, playSound]);

    // ── 다음 문제 ──
    const handleNext = useCallback(async () => {
        playSound("hit");
        await nextQuestion();
    }, [nextQuestion, playSound]);

    // ── 난이도 선택 ──
    const handleDifficultySelect = useCallback(async (d: "easy" | "normal" | "hard") => {
        setDifficulty(d);
        setScoreSubmitted(false);
        await startGame(d);
    }, [setDifficulty, startGame]);

    const handleRestart = useCallback(async () => {
        setScoreSubmitted(false);
        setInput("");
        await restart();
    }, [restart]);

    const handleBackToMenu = useCallback(() => {
        setInput("");
        setScoreSubmitted(false);
        backToMenu();
    }, [backToMenu]);

    // ── 난이도 선택 화면 ──
    if (phase === "idle") {
        return (
            <div className="relative flex-1 min-h-[400px] flex items-center justify-center">
                <DifficultySelector
                    title={ko ? "받아쓰기" : "Dictation"}
                    subtitle={ko ? "듣고 받아쓰세요!" : "Listen and type!"}
                    descriptions={{
                        easy: ko ? "느린 속도, 3회 재생" : "Slow speed, 3 plays",
                        normal: ko ? "보통 속도, 2회 재생" : "Normal speed, 2 plays",
                        hard: ko ? "빠른 속도, 1회 재생" : "Fast speed, 1 play",
                    }}
                    onSelect={handleDifficultySelect}
                />
            </div>
        );
    }

    // ── 결과 화면 ──
    if (phase === "finished") {
        return (
            <div className="relative flex-1 min-h-[400px]">
                <GameOverModal
                    title={ko ? "받아쓰기 완료!" : "Dictation Complete!"}
                    primaryStat={
                        <div>
                            <p className="text-3xl sm:text-5xl font-bold text-[var(--retro-accent)] tabular-nums">
                                {finalScore.toLocaleString()}
                            </p>
                            <p className="text-xs sm:text-sm text-[var(--retro-text)]/60 mt-1">
                                {ko ? "최종 점수" : "Final Score"}
                            </p>
                        </div>
                    }
                    stats={[
                        { label: ko ? "평균 정확도" : "Avg Accuracy", value: `${averageAccuracy}%` },
                        { label: ko ? "만점 문제" : "Perfect", value: `${perfectCount}/${totalQuestions}` },
                        { label: ko ? "난이도" : "Difficulty", value: difficulty.toUpperCase() },
                    ]}
                    badge={
                        <>
                            <AchievementUnlockBadge achievements={newlyUnlocked} ko={ko} />
                            {isLoggedIn ? (
                                <p className="text-xs text-emerald-500 mb-2">
                                    {ko ? "✓ 리더보드에 기록됨" : "✓ Saved to leaderboard"}
                                </p>
                            ) : (
                                <p className="text-xs text-[var(--retro-text)]/50 mb-2">
                                    {ko ? "로그인하면 기록이 저장됩니다" : "Log in to save your score"}
                                </p>
                            )}
                        </>
                    }
                    buttons={[
                        { label: ko ? "다시 하기" : "Retry", onClick: handleRestart, primary: true },
                        { label: ko ? "메뉴" : "Menu", onClick: handleBackToMenu },
                    ]}
                >
                    {/* 문제별 결과 미니 리스트 */}
                    <div className="mb-4 max-h-[200px] overflow-y-auto text-left">
                        {results.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 py-1 border-b border-[var(--retro-border-mid)]/30 text-xs">
                                <span className="text-[var(--retro-text)]/50 w-5 tabular-nums">{i + 1}.</span>
                                <span className="flex-1 truncate text-[var(--retro-text)]">{r.sentence}</span>
                                <span className={`font-bold tabular-nums ${
                                    r.accuracy === 100 ? "text-emerald-500" : r.accuracy >= 80 ? "text-yellow-500" : "text-red-500"
                                }`}>
                                    {r.accuracy}%
                                </span>
                            </div>
                        ))}
                    </div>
                </GameOverModal>
            </div>
        );
    }

    // ── 게임 플레이 화면 ──
    const progressPercent = ((questionIndex + (phase === "grading" ? 1 : 0)) / totalQuestions) * 100;

    return (
        <div className="flex-1 min-h-0 flex flex-col select-none">
            {/* 진행 바 */}
            <div className="px-3 py-2 border-b-2 border-[var(--retro-border-mid)] bg-[var(--retro-surface)]"
                style={{
                    borderTop: "2px solid var(--retro-border-light)",
                    borderLeft: "2px solid var(--retro-border-light)",
                    borderRight: "2px solid var(--retro-border-dark)",
                    borderBottom: "2px solid var(--retro-border-dark)",
                }}
            >
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs sm:text-sm font-bold text-[var(--retro-text)]">
                        {ko ? `문제 ${questionIndex + 1}/${totalQuestions}` : `Question ${questionIndex + 1}/${totalQuestions}`}
                    </span>
                    <span className="text-xs sm:text-sm text-[var(--retro-text)]/80 tabular-nums" aria-live="polite">
                        {ko ? "점수" : "Score"}: {results.reduce((s, r) => s + r.accuracy, 0)}
                    </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
            </div>

            {/* 메인 영역 */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-10 gap-6">

                {/* 카세트 테이프 + 재생 버튼 */}
                <div className="flex flex-col items-center gap-2">
                    {/* 카세트 테이프 */}
                    <svg width="120" height="72" viewBox="0 0 120 72" className="mb-1" aria-hidden="true">
                        <rect x="2" y="2" width="116" height="68" rx="6" fill="var(--retro-surface-alt)" stroke="var(--retro-border-dark)" strokeWidth="2" />
                        <rect x="10" y="10" width="100" height="36" rx="2" fill="var(--retro-field-bg)" stroke="var(--retro-border-mid)" strokeWidth="1" />
                        <circle cx="38" cy="28" r="10" fill="none" stroke="var(--retro-border-mid)" strokeWidth="1.5">
                            {isSpeaking && <animateTransform attributeName="transform" type="rotate" from="0 38 28" to="360 38 28" dur="2s" repeatCount="indefinite" />}
                        </circle>
                        <circle cx="82" cy="28" r="10" fill="none" stroke="var(--retro-border-mid)" strokeWidth="1.5">
                            {isSpeaking && <animateTransform attributeName="transform" type="rotate" from="0 82 28" to="360 82 28" dur="1.5s" repeatCount="indefinite" />}
                        </circle>
                        <circle cx="38" cy="28" r="4" fill="var(--retro-border-dark)" />
                        <circle cx="82" cy="28" r="4" fill="var(--retro-border-dark)" />
                        <line x1="48" y1="28" x2="72" y2="28" stroke="var(--retro-border-mid)" strokeWidth="0.5" />
                        <rect x="30" y="52" width="60" height="8" rx="2" fill="var(--retro-border-mid)" opacity="0.3" />
                        <text x="60" y="59" textAnchor="middle" fontSize="6" fill="var(--retro-text)" opacity="0.5" fontFamily="monospace">KEYWORK</text>
                    </svg>
                    <Button
                        onClick={() => void playSentence()}
                        disabled={isSpeaking || phase === "grading"}
                        variant="outline"
                        className={`h-16 w-16 sm:h-20 sm:w-20 text-3xl sm:text-4xl border-2 ${
                            retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"
                        } ${isSpeaking
                            ? "border-[var(--retro-accent)] bg-[var(--retro-accent)]/10"
                            : "border-[var(--retro-border-mid)] hover:border-[var(--retro-accent)]"
                        }`}
                        aria-label={ko ? "다시 듣기" : "Play again"}
                    >
                        {isSpeaking ? "🔊" : "🔈"}
                    </Button>
                    <p className="text-xs text-[var(--retro-text)]/60">
                        {phase === "grading"
                            ? (ko ? "채점 완료" : "Graded")
                            : playsRemaining > 0
                                ? (ko ? `다시 듣기 (${playsRemaining}회 남음)` : `Play again (${playsRemaining} left)`)
                                : (ko ? "재생 횟수 소진" : "No plays left")
                        }
                    </p>
                </div>

                {/* TTS 폴백: 텍스트 표시 */}
                {showFallback && (
                    <div className="px-4 py-3 border-2 border-yellow-500/50 bg-yellow-500/10 text-center font-mono text-base sm:text-lg text-[var(--retro-text)]">
                        {currentSentence}
                    </div>
                )}

                {/* 입력창 */}
                <div className="w-full max-w-lg">
                    <GameInput
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSubmit}
                        disabled={phase !== "playing"}
                        placeholder={ko ? "들은 문장을 입력하세요..." : "Type what you heard..."}
                        ariaLabel={ko ? "받아쓰기 입력" : "Dictation input"}
                        inputRef={inputRef}
                    />
                </div>

                {/* 채점 결과 */}
                {phase === "grading" && currentDiff && currentAccuracy !== null && (
                    <div className="w-full max-w-lg space-y-3 animate-[game-celebration_0.3s_ease-out]">
                        {/* 정확도 */}
                        <div className="text-center">
                            <span className={`text-2xl sm:text-4xl font-bold tabular-nums ${
                                currentAccuracy === 100 ? "text-emerald-500" : currentAccuracy >= 80 ? "text-yellow-500" : "text-red-500"
                            }`}>
                                {currentAccuracy}%
                            </span>
                            {currentAccuracy === 100 && (
                                <span className="ml-2 text-emerald-500 text-sm font-bold">PERFECT!</span>
                            )}
                        </div>

                        {/* 원문 + diff */}
                        <div className="px-3 py-2 border-2 border-[var(--retro-border-mid)] bg-[var(--retro-field-bg)] font-mono text-base sm:text-lg leading-relaxed">
                            <p className="text-[10px] sm:text-xs text-[var(--retro-text)]/50 mb-1">
                                {ko ? "정답" : "Answer"}
                            </p>
                            <div className="flex flex-wrap">
                                {currentDiff.map((d, i) => (
                                    <DiffCharSpan key={i} d={d} />
                                ))}
                            </div>
                        </div>

                        {/* 내 입력 */}
                        <div className="px-3 py-2 border border-[var(--retro-border-mid)]/50 bg-[var(--retro-surface)] font-mono text-sm text-[var(--retro-text)]/70">
                            <p className="text-[10px] sm:text-xs text-[var(--retro-text)]/50 mb-1">
                                {ko ? "내 답" : "Your answer"}
                            </p>
                            {input.trim() || (ko ? "(빈 입력)" : "(empty)")}
                        </div>

                        {/* 다음 버튼 */}
                        <div className="text-center">
                            <Button
                                onClick={handleNext}
                                className={`px-6 py-2.5 sm:px-8 sm:py-3 font-medium text-sm sm:text-base ${
                                    retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
                                }`}
                            >
                                {questionIndex + 1 >= totalQuestions
                                    ? (ko ? "결과 보기" : "See Results")
                                    : (ko ? "다음 문제 →" : "Next →")
                                }
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Diff 글자 스팬 ──

const DiffCharSpan: React.FC<{ d: DiffChar }> = ({ d }) => {
    const colorClass =
        d.status === "correct" ? "text-emerald-500" :
        d.status === "incorrect" ? "text-red-500 underline decoration-red-400" :
        d.status === "missing" ? "text-red-400/60 bg-red-500/10" :
        "text-orange-400";

    return (
        <span className={`${colorClass} ${d.char === " " ? "mr-1" : ""}`}>
            {d.char === " " ? "\u00A0" : d.char}
        </span>
    );
};

export default DictationGame;
