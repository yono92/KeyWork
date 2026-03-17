import React from "react";
import useTypingStore from "../store/store";
import { formatPlayTime } from "../utils/formatting";
import PauseOverlay from "./game/PauseOverlay";
import GameOverModal from "./game/GameOverModal";
import GameInput from "./game/GameInput";
import { Button } from "@/components/ui/button";
import FallbackNotice from "./game/FallbackNotice";
import { useWordChainGame, getStartChars } from "../hooks/useWordChainGame";

const WordChainGame: React.FC = () => {
    const darkMode = useTypingStore((s) => s.darkMode);
    const retroTheme = useTypingStore((s) => s.retroTheme);

    const game = useWordChainGame();

    return (
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] overflow-hidden retro-monitor-bezel">
            <div className={`absolute inset-0 flex flex-col ${darkMode ? "bg-[var(--retro-game-bg)]" : "bg-[var(--retro-surface-alt)]"} transition-all duration-300`}
                style={game.timer <= 3 && game.gameStarted && !game.gameOver && !game.isAiTurn ? {
                    boxShadow: "inset 0 0 40px rgba(239,68,68,0.1)",
                } : undefined}
            >
                {/* Top bar */}
                <div className={`border-b-2 z-10 ${
                    darkMode ? "bg-[var(--retro-game-panel)] border-[var(--retro-game-panel-border-lo)]" : "bg-[var(--retro-surface)] border-[var(--retro-border-mid)]"
                }`}>
                    <div className="flex justify-between items-center px-2.5 py-1.5 sm:px-5 sm:py-2.5">
                        <div className="font-pixel" style={{ fontSize: "clamp(7px, 1.2vw, 10px)", lineHeight: 1.8 }} aria-live="polite" aria-atomic="true">
                            <span className="text-[var(--retro-game-text-dim)]">SCORE </span>
                            <span className="text-[var(--retro-game-warning)] tabular-nums">{game.score.toLocaleString().padStart(5, "0")}</span>
                            {game.combo > 0 && (
                                <span className="ml-2 sm:ml-4 text-[var(--retro-game-info)]">
                                    x{Math.min(1 + game.combo * 0.2, 2).toFixed(1)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            <div className={`font-pixel tabular-nums ${
                                game.timer <= 3 ? "text-[var(--retro-game-danger)] animate-wordchain-timer-pulse" : "text-[var(--retro-game-text)]"
                            }`} style={{ fontSize: "clamp(7px, 1.2vw, 10px)", lineHeight: 1.8 }}>
                                {game.timer}s
                            </div>
                            <div className="flex gap-0.5 text-sm sm:text-lg" aria-label={`Lives: ${game.lives} / ${game.config.lives}`}>
                                {Array.from({ length: game.config.lives }, (_, i) => (
                                    <span key={i} className={`transition-all ${i >= game.lives ? "grayscale opacity-40" : ""}`}>
                                        {i < game.lives ? "❤️" : "🖤"}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* 타이머 프로그레스 바 */}
                    {game.gameStarted && !game.gameOver && (
                        <div className="h-1 bg-[var(--retro-game-bg)]">
                            <div
                                className={`h-full transition-all duration-1000 linear ${
                                    game.timer <= 3 ? "bg-[var(--retro-game-danger)]" : "bg-[var(--retro-game-info)]"
                                }`}
                                style={{ width: `${(game.timer / game.config.timeLimit) * 100}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Current start character hint */}
                {game.currentChar && game.gameStarted && !game.gameOver && (
                    <div className="flex justify-center py-2">
                        <span className={`px-4 py-1.5 text-sm font-medium border-2 ${
                            darkMode ? "bg-[var(--retro-game-panel)] text-[var(--retro-game-info)] border-[var(--retro-game-panel-border-hi)]" : "bg-[var(--retro-surface)] text-[var(--retro-accent)] border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
                        }`}>
                            {(() => {
                                const chars = getStartChars(game.currentChar);
                                if (chars.length > 1) {
                                    return `"${chars.join('" 또는 "')}"로 시작하는 단어`;
                                }
                                return `"${game.currentChar}"로 시작하는 단어`;
                            })()}
                        </span>
                    </div>
                )}
                {game.fallbackMessage && (
                    <div className="px-3 sm:px-4 pb-2">
                        <FallbackNotice
                            darkMode={darkMode}
                            message={game.fallbackMessage}
                            onRetry={() => {
                                void game.fetchKrdictCandidates(game.currentChar ? getStartChars(game.currentChar) : ["가"]);
                            }}
                        />
                    </div>
                )}

                {/* Chat area */}
                <div
                    ref={game.chatContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
                >
                    {game.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === "player" ? "justify-end" : "justify-start"} animate-chat-bubble`}
                        >
                            <div className="max-w-[78%]">
                                <div className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
                                    darkMode ? "text-slate-400" : "text-slate-500"
                                }`}>
                                    {msg.sender === "ai" ? "상대" : "나"}
                                </div>
                                <div className={`px-4 py-2.5 text-sm font-medium transition-all border-2 ${
                                    msg.sender === "ai"
                                        ? darkMode
                                            ? "bg-white/[0.08] text-white border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
                                            : "bg-slate-100 text-slate-800 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
                                        : msg.isValid
                                            ? "bg-[var(--retro-game-highlight)] text-white border-[var(--retro-game-highlight)] shadow-[0_0_12px_var(--retro-game-glow)]"
                                            : "bg-rose-500/80 text-white border-rose-600 line-through animate-wordchain-shake"
                                }`}>
                                    {msg.text}
                                </div>
                                {msg.isValid && msg.definition && (
                                    <div className={`mt-1.5 px-3 py-2 rounded-xl border text-[11px] sm:text-xs leading-relaxed ${
                                        darkMode
                                            ? "bg-slate-950/50 border-sky-500/20 text-slate-200"
                                            : "bg-sky-50/80 border-sky-200 text-slate-700"
                                    }`}>
                                        <span className="font-semibold text-[var(--retro-game-info)] mr-1">
                                            의미
                                        </span>
                                        <span>{msg.definition}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {game.isAiTurn && (
                        <div className="flex justify-start animate-chat-bubble" aria-live="polite">
                            <div className={`px-4 py-2.5 border-2 text-sm ${
                                darkMode
                                    ? "bg-[var(--retro-game-panel)] text-[var(--retro-game-text)] border-[var(--retro-game-panel-border-hi)]"
                                    : "bg-[var(--retro-surface-alt)] text-[var(--retro-text)] border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)]"
                            }`}>
                                <span className="font-pixel" style={{ fontSize: 8 }}>AI THINKING</span>{" "}
                                <span className="inline-flex gap-0.5 ml-1">
                                    {[0, 1, 2].map((i) => (
                                        <span
                                            key={i}
                                            className="inline-block w-1.5 h-1.5 bg-current"
                                            style={{
                                                animation: `tetris-blink 800ms step-end ${i * 200}ms infinite`,
                                            }}
                                        />
                                    ))}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className={`p-2.5 sm:p-4 border-t-2 ${
                    darkMode ? "bg-[var(--retro-game-panel)] border-[var(--retro-game-panel-border-hi)]" : "bg-[var(--retro-surface)] border-[var(--retro-border-mid)]"
                }`}>
                    <div className="flex gap-2 sm:gap-3">
                        <GameInput
                            inputRef={game.inputRef}
                            value={game.input}
                            onChange={game.setInput}
                            onSubmit={() => void game.handleSubmit()}
                            disabled={!game.gameStarted || game.isPaused || game.gameOver || game.isAiTurn || game.isValidatingWord}
                            className="flex-1"
                            placeholder={
                                game.isAiTurn
                                    ? "상대 차례입니다…"
                                    : game.isValidatingWord
                                        ? "단어 검증 중…"
                                        : game.currentChar
                                            ? (() => {
                                                const chars = getStartChars(game.currentChar);
                                                return chars.length > 1
                                                    ? `"${chars.join('" / "')}"로 시작하는 단어 입력`
                                                    : `"${game.currentChar}"로 시작하는 단어 입력`;
                                            })()
                                            : "단어를 입력하세요…"
                            }
                            ariaLabel="끝말잇기 단어 입력"
                        />
                        <Button
                            onClick={() => void game.handleSubmit()}
                            disabled={!game.gameStarted || game.isPaused || game.gameOver || game.isAiTurn || game.isValidatingWord || !game.input.trim()}
                            variant="secondary"
                            className={`h-auto px-4 py-2 sm:px-6 sm:py-3 font-medium text-sm sm:text-base disabled:opacity-50 ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                        >
                            {game.isValidatingWord ? "검증중…" : "입력"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Pause overlay */}
            {game.isPaused && !game.gameOver && <PauseOverlay language="korean" />}

            {/* Game over overlay */}
            {game.gameOver && (
                <GameOverModal
                    title={game.playerWon ? "YOU WIN!" : "GAME OVER"}
                    badge={game.playerWon ? (
                        <p className="font-pixel text-[var(--retro-game-warning)] mb-3 animate-celebration"
                            style={{ fontSize: 12, textShadow: "0 0 15px rgba(251,191,36,0.6)" }}
                        >
                            ★ VICTORY ★
                        </p>
                    ) : undefined}
                    primaryStat={
                        <p className={`text-xl mb-1 ${darkMode ? "text-white" : "text-slate-800"}`}>
                            Score: <span className="font-bold tabular-nums">{game.score.toLocaleString()}</span>
                        </p>
                    }
                    stats={[
                        { label: "입력 단어 수", value: game.wordsTypedRef.current },
                        { label: "최대 콤보", value: game.maxComboRef.current },
                        { label: "플레이 시간", value: formatPlayTime(Date.now() - game.gameStartTimeRef.current, "ko") },
                    ]}
                    buttons={[
                        { label: "다시 하기", onClick: () => game.restartGame(), primary: true },
                    ]}
                />
            )}
        </div>
    );
};

export default WordChainGame;
