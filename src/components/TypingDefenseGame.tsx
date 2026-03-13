"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import useTypingStore from "../store/store";
import { useDefenseEngine, type Enemy, type EnemyType } from "../hooks/useDefenseEngine";
import { useGameAudio } from "../hooks/useGameAudio";
import { useScoreSubmit } from "../hooks/useScoreSubmit";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import DifficultySelector from "./game/DifficultySelector";
import GameOverModal from "./game/GameOverModal";
import PauseOverlay from "./game/PauseOverlay";
import GameInput from "./game/GameInput";
import AchievementUnlockBadge from "./game/AchievementUnlockBadge";

// ── 적 외형 설정 ──

const ENEMY_VISUAL: Record<EnemyType, {
    emoji: string;
    bgColor: string;
    textColor: string;
    size: string;
}> = {
    normal: { emoji: "👾", bgColor: "bg-emerald-600/80", textColor: "text-white", size: "text-2xl sm:text-3xl" },
    fast: { emoji: "⚡", bgColor: "bg-yellow-500/80", textColor: "text-white", size: "text-xl sm:text-2xl" },
    tank: { emoji: "🛡️", bgColor: "bg-blue-700/80", textColor: "text-white", size: "text-3xl sm:text-4xl" },
    boss: { emoji: "👹", bgColor: "bg-red-700/90", textColor: "text-white", size: "text-4xl sm:text-5xl" },
};

// ── 이펙트 타입 ──

interface ScorePopup {
    id: number;
    x: number;
    y: number;
    score: number;
    combo: number;
}

interface Explosion {
    id: number;
    x: number;
    y: number;
    isBoss: boolean;
}

// ── 메인 컴포넌트 ──

const TypingDefenseGame: React.FC = () => {
    const language = useTypingStore((s) => s.language);
    const difficulty = useTypingStore((s) => s.difficulty);
    const setDifficulty = useTypingStore((s) => s.setDifficulty);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const ko = language === "korean";

    const {
        enemies,
        stats,
        isPaused,
        startGame,
        restart,
        backToMenu,
        tryMatch,
        killEnemy,
    } = useDefenseEngine(language);

    const { playSound } = useGameAudio();
    const { submitScore, isLoggedIn } = useScoreSubmit();
    const { checkAchievements, newlyUnlocked } = useAchievementChecker();

    const [input, setInput] = useState("");
    const [animEnabled, setAnimEnabled] = useState(true);
    const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
    const [explosions, setExplosions] = useState<Explosion[]>([]);
    const [hitFlash, setHitFlash] = useState(false);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [scoreSubmitted, setScoreSubmitted] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const popupIdRef = useRef(0);
    const fieldRef = useRef<HTMLDivElement>(null);

    // 게임 시작 시 포커스
    useEffect(() => {
        if (stats.phase === "playing" || stats.phase === "waveBreak") {
            inputRef.current?.focus();
        }
    }, [stats.phase]);

    // 일시정지 해제 시 포커스
    useEffect(() => {
        if (!isPaused && (stats.phase === "playing" || stats.phase === "waveBreak")) {
            inputRef.current?.focus();
        }
    }, [isPaused, stats.phase]);

    // 기지 피격 플래시
    useEffect(() => {
        const reached = enemies.filter((e) => e.status === "reached");
        if (reached.length > 0 && animEnabled) {
            playSound("lifeLost");
            setHitFlash(true);
            setTimeout(() => setHitFlash(false), 300);
        }
    }, [enemies, animEnabled, playSound]);

    // 게임 오버 시 점수 제출 + 업적 검사
    useEffect(() => {
        if (stats.phase === "gameOver" && !scoreSubmitted) {
            playSound("gameOver");
            setScoreSubmitted(true);
            const scoreData = {
                game_mode: "typing-defense",
                score: stats.score,
            };
            if (isLoggedIn) {
                void submitScore(scoreData).then(() => checkAchievements(scoreData));
            }
        }
    }, [stats.phase, scoreSubmitted, isLoggedIn, submitScore, stats.score, playSound, checkAchievements]);

    // 이펙트: 점수 팝업 제거
    useEffect(() => {
        if (scorePopups.length === 0) return;
        const timer = setTimeout(() => {
            setScorePopups((prev) => prev.slice(1));
        }, 800);
        return () => clearTimeout(timer);
    }, [scorePopups]);

    // 이펙트: 폭발 제거
    useEffect(() => {
        if (explosions.length === 0) return;
        const timer = setTimeout(() => {
            setExplosions((prev) => prev.slice(1));
        }, 500);
        return () => clearTimeout(timer);
    }, [explosions]);

    // ── 입력 처리 ──
    const handleSubmit = useCallback(() => {
        if (!input.trim()) return;

        const result = tryMatch(input);
        if (result.matched && result.enemy) {
            const { score: earned, combo: newCombo } = killEnemy(result.enemy);

            // 이펙트
            if (animEnabled) {
                const id = popupIdRef.current++;
                setScorePopups((prev) => [
                    ...prev,
                    { id, x: result.enemy!.x, y: 50, score: earned, combo: newCombo },
                ]);
                setExplosions((prev) => [
                    ...prev,
                    { id, x: result.enemy!.x, y: 50, isBoss: result.enemy!.type === "boss" },
                ]);

                if (result.enemy!.type === "boss") {
                    playSound("win");
                    setShakeScreen(true);
                    setTimeout(() => setShakeScreen(false), 400);
                } else if (newCombo >= 5) {
                    playSound("combo");
                } else {
                    playSound("destroy");
                }
            } else {
                playSound("destroy");
            }

            setInput("");
        } else if (!result.isPartial) {
            playSound("wrong");
        }
    }, [input, tryMatch, killEnemy, animEnabled, playSound]);

    // 입력 변경 시 부분 매칭 업데이트
    const handleInputChange = useCallback((value: string) => {
        setInput(value);
        if (value.trim()) {
            tryMatch(value);
        }
    }, [tryMatch]);

    // ── 난이도 선택 ──
    const handleDifficultySelect = useCallback((d: "easy" | "normal" | "hard") => {
        setDifficulty(d);
        setScoreSubmitted(false);
        startGame(d);
    }, [setDifficulty, startGame]);

    const handleRestart = useCallback(() => {
        setScoreSubmitted(false);
        setInput("");
        restart();
    }, [restart]);

    const handleBackToMenu = useCallback(() => {
        setInput("");
        setScoreSubmitted(false);
        backToMenu();
    }, [backToMenu]);

    // ── 렌더링 ──

    // 난이도 선택 화면
    if (stats.phase === "idle") {
        return (
            <div className="relative flex-1 min-h-[400px] flex items-center justify-center">
                <DifficultySelector
                    title={ko ? "타이핑 디펜스" : "Typing Defense"}
                    subtitle={ko ? "단어를 타이핑해서 적을 처치하세요!" : "Type words to defeat enemies!"}
                    descriptions={{
                        easy: ko ? "느린 적, 5목숨" : "Slow enemies, 5 lives",
                        normal: ko ? "보통 속도, 3목숨" : "Normal speed, 3 lives",
                        hard: ko ? "빠른 적, 2목숨" : "Fast enemies, 2 lives",
                    }}
                    onSelect={handleDifficultySelect}
                />
            </div>
        );
    }

    return (
        <div className={`relative flex-1 min-h-0 flex flex-col select-none ${shakeScreen && animEnabled ? "animate-[tetris-shake_0.4s_ease-out]" : ""}`}>
            {/* HUD */}
            <div className="flex items-center justify-between px-3 py-2 border-b-2 border-[var(--retro-border-mid)] bg-[var(--retro-surface)]"
                style={{
                    borderTop: "2px solid var(--retro-border-light)",
                    borderLeft: "2px solid var(--retro-border-light)",
                    borderRight: "2px solid var(--retro-border-dark)",
                    borderBottom: "2px solid var(--retro-border-dark)",
                }}
            >
                <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-mono">
                    <span className="font-bold text-[var(--retro-text)]">
                        {ko ? `웨이브 ${stats.wave}` : `Wave ${stats.wave}`}
                    </span>
                    <span className="text-[var(--retro-text)]/80" aria-live="polite">
                        {ko ? "점수" : "Score"}: <span className="font-bold tabular-nums">{stats.score.toLocaleString()}</span>
                    </span>
                    {stats.combo > 1 && (
                        <span className={`font-bold ${stats.combo >= 10 ? "text-red-500" : stats.combo >= 5 ? "text-orange-500" : "text-yellow-500"}`}>
                            ×{stats.combo} {ko ? "콤보" : "Combo"}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* FX 토글 */}
                    <button
                        onClick={() => setAnimEnabled((prev) => !prev)}
                        className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold border-2 ${
                            retroTheme === "mac-classic" ? "rounded" : "rounded-none"
                        } ${animEnabled
                            ? "border-[var(--retro-border-dark)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]"
                            : "border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/60"
                        }`}
                    >
                        FX {animEnabled ? "ON" : "OFF"}
                    </button>

                    {/* 목숨 */}
                    <div className="flex gap-0.5" aria-label={`${stats.lives} lives remaining`}>
                        {Array.from({ length: stats.maxLives }).map((_, i) => (
                            <span key={i} className={`text-sm sm:text-base ${i < stats.lives ? "opacity-100" : "opacity-20"}`}>
                                ♥
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 게임 필드 */}
            <div
                ref={fieldRef}
                className="relative flex-1 min-h-[300px] sm:min-h-[400px] overflow-hidden"
                style={{
                    background: "linear-gradient(180deg, var(--retro-surface-alt) 0%, var(--retro-surface) 100%)",
                }}
            >
                {/* 기지 */}
                <div className="absolute left-0 top-0 bottom-0 w-[8%] sm:w-[6%] flex items-center justify-center border-r-2 border-[var(--retro-border-dark)]"
                    style={{
                        background: `repeating-linear-gradient(
                            45deg,
                            var(--retro-surface),
                            var(--retro-surface) 4px,
                            var(--retro-surface-alt) 4px,
                            var(--retro-surface-alt) 8px
                        )`,
                    }}
                >
                    <div className="text-2xl sm:text-3xl">🏰</div>
                </div>

                {/* 적 렌더링 */}
                {enemies.map((enemy) => (
                    <EnemySprite
                        key={enemy.id}
                        enemy={enemy}
                        animEnabled={animEnabled}
                    />
                ))}

                {/* 점수 팝업 */}
                {animEnabled && scorePopups.map((popup) => (
                    <div
                        key={popup.id}
                        className="absolute pointer-events-none font-bold text-sm sm:text-base z-20"
                        style={{
                            left: `${popup.x}%`,
                            top: "30%",
                            animation: "defense-score-popup 0.8s ease-out forwards",
                        }}
                    >
                        <span className="text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            +{popup.score}
                        </span>
                        {popup.combo > 1 && (
                            <span className="ml-1 text-orange-400 text-xs">
                                ×{popup.combo}
                            </span>
                        )}
                    </div>
                ))}

                {/* 폭발 */}
                {animEnabled && explosions.map((exp) => (
                    <div
                        key={exp.id}
                        className="absolute pointer-events-none z-10"
                        style={{
                            left: `${exp.x}%`,
                            top: "40%",
                            animation: "defense-explosion 0.5s ease-out forwards",
                        }}
                    >
                        <span className={exp.isBoss ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}>
                            💥
                        </span>
                    </div>
                ))}

                {/* 카운트다운 */}
                {stats.phase === "countdown" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                        <span
                            className="text-6xl sm:text-8xl font-bold text-white drop-shadow-lg"
                            style={{ animation: "defense-countdown 1s ease-out infinite" }}
                        >
                            {stats.countdown}
                        </span>
                    </div>
                )}

                {/* 웨이브 브레이크 */}
                {stats.phase === "waveBreak" && !isPaused && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
                        <div className="text-center">
                            <p className="text-lg sm:text-2xl font-bold text-emerald-400 mb-2"
                                style={{ animation: animEnabled ? "game-celebration 0.5s ease-out" : "none" }}
                            >
                                {ko ? "웨이브 클리어!" : "Wave Clear!"}
                            </p>
                            <p className="text-3xl sm:text-5xl font-bold text-white">
                                {ko ? `웨이브 ${stats.wave + 1}` : `Wave ${stats.wave + 1}`}
                            </p>
                            <p className="text-sm sm:text-base text-white/70 mt-2 tabular-nums">
                                {stats.waveBreakTimer}s
                            </p>
                        </div>
                    </div>
                )}

                {/* 피격 플래시 */}
                {hitFlash && animEnabled && (
                    <div
                        className="absolute inset-0 pointer-events-none z-30"
                        style={{
                            boxShadow: "inset 0 0 60px rgba(255, 0, 0, 0.4)",
                            animation: "defense-hit-flash 0.3s ease-out forwards",
                        }}
                    />
                )}
            </div>

            {/* 입력창 */}
            <div className="px-3 py-2 border-t-2 border-[var(--retro-border-mid)] bg-[var(--retro-surface)]"
                style={{
                    borderTop: "2px solid var(--retro-border-dark)",
                    borderLeft: "2px solid var(--retro-border-light)",
                    borderRight: "2px solid var(--retro-border-dark)",
                    borderBottom: "2px solid var(--retro-border-light)",
                }}
            >
                <GameInput
                    value={input}
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    disabled={stats.phase !== "playing" || isPaused}
                    placeholder={ko ? "단어를 입력하세요..." : "Type a word..."}
                    ariaLabel={ko ? "적 처치 단어 입력" : "Type word to defeat enemy"}
                    inputRef={inputRef}
                />
            </div>

            {/* 일시정지 오버레이 */}
            {isPaused && <PauseOverlay language={language} />}

            {/* 게임 오버 모달 */}
            {stats.phase === "gameOver" && (
                <GameOverModal
                    title={ko ? "게임 오버" : "Game Over"}
                    primaryStat={
                        <div>
                            <p className="text-3xl sm:text-5xl font-bold text-[var(--retro-accent)] tabular-nums">
                                {stats.score.toLocaleString()}
                            </p>
                            <p className="text-xs sm:text-sm text-[var(--retro-text)]/60 mt-1">
                                {ko ? "최종 점수" : "Final Score"}
                            </p>
                        </div>
                    }
                    stats={[
                        { label: ko ? "웨이브" : "Wave", value: stats.wave },
                        { label: ko ? "처치 수" : "Kills", value: stats.kills },
                        { label: ko ? "보스 처치" : "Boss Kills", value: stats.bossKills },
                        { label: ko ? "최대 콤보" : "Max Combo", value: `×${stats.maxCombo}` },
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
                />
            )}
        </div>
    );
};

// ── 적 스프라이트 컴포넌트 ──

const EnemySprite: React.FC<{ enemy: Enemy; animEnabled: boolean }> = React.memo(({ enemy, animEnabled }) => {
    const visual = ENEMY_VISUAL[enemy.type];

    if (enemy.status === "reached") return null;

    const isDying = enemy.status === "dying";
    const isTargeted = enemy.status === "targeted";

    // 적 위치: x는 8%~98% (기지 영역 이후)
    const displayX = 8 + (enemy.x / 100) * 88;
    // y 위치: 적 타입별 랜덤 배치 (id 기반 결정적)
    const yBase = 15 + ((enemy.id * 37) % 60);

    return (
        <div
            className={`absolute flex flex-col items-center transition-none ${isDying ? "pointer-events-none" : ""}`}
            style={{
                left: `${displayX}%`,
                top: `${yBase}%`,
                transform: "translate(-50%, -50%)",
                animation: isDying && animEnabled
                    ? "defense-enemy-die 0.4s ease-out forwards"
                    : undefined,
                zIndex: enemy.type === "boss" ? 5 : 1,
            }}
        >
            {/* 단어 라벨 */}
            <div
                className={`px-1.5 py-0.5 sm:px-2 sm:py-1 mb-1 text-[10px] sm:text-xs font-mono font-bold whitespace-nowrap border ${
                    isTargeted
                        ? "border-yellow-400 bg-black/80"
                        : "border-[var(--retro-border-mid)] bg-black/70"
                } ${enemy.type === "boss" ? "max-w-[180px] sm:max-w-[280px] truncate" : ""}`}
            >
                {enemy.word.split("").map((char, i) => (
                    <span
                        key={i}
                        className={
                            i < enemy.matchedChars
                                ? "text-emerald-400"
                                : "text-white"
                        }
                    >
                        {char}
                    </span>
                ))}
            </div>

            {/* 적 아이콘 */}
            <span
                className={`${visual.size} ${
                    animEnabled && !isDying ? "animate-[defense-enemy-march_0.6s_ease-in-out_infinite]" : ""
                }`}
            >
                {visual.emoji}
            </span>
        </div>
    );
});

EnemySprite.displayName = "EnemySprite";

export default TypingDefenseGame;
