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
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-sky-200/40 dark:border-sky-500/10">
            <div className={`absolute inset-0 flex flex-col ${darkMode ? "bg-[#0e1825]" : "bg-gradient-to-b from-sky-50/80 to-white"}`}>
                {/* Top bar */}
                <div className={`flex justify-between items-center px-2.5 py-2 sm:px-5 sm:py-3 backdrop-blur-sm border-b z-10 ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
                }`}>
                    <div className={`text-xs sm:text-lg font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                        Score: <span className="tabular-nums">{game.score}</span>
                        {game.combo > 0 && (
                            <span className="ml-1 sm:ml-2 text-[10px] sm:text-sm text-sky-400">
                                x{Math.min(1 + game.combo * 0.2, 2).toFixed(1)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        <div className={`text-xs sm:text-lg font-bold tabular-nums ${
                            game.timer <= 3 ? "text-rose-400 animate-pulse" : darkMode ? "text-white" : "text-slate-800"
                        }`}>
                            ⏱ {game.timer}s
                        </div>
                        <div className={`text-sm sm:text-lg ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {"❤️".repeat(Math.max(game.lives, 0))}
                            {"🖤".repeat(Math.max(game.config.lives - game.lives, 0))}
                        </div>
                    </div>
                </div>

                {/* Current start character hint */}
                {game.currentChar && game.gameStarted && !game.gameOver && (
                    <div className="flex justify-center py-2">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                            darkMode ? "bg-sky-500/15 text-sky-300 border border-sky-500/20" : "bg-sky-50 text-sky-600 border border-sky-200"
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
                            sourceLabel={game.dictionarySource === "krdict" ? "krdict" : "local wordchain-dict"}
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
                                <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${
                                    msg.sender === "ai"
                                        ? darkMode
                                            ? "bg-white/[0.08] text-white rounded-bl-md"
                                            : "bg-slate-100 text-slate-800 rounded-bl-md"
                                        : msg.isValid
                                            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-br-md"
                                            : "bg-rose-500/80 text-white rounded-br-md line-through"
                                }`}>
                                    {msg.text}
                                </div>
                                {msg.isValid && msg.definition && (
                                    <div className={`mt-1.5 px-3 py-2 rounded-xl border text-[11px] sm:text-xs leading-relaxed ${
                                        darkMode
                                            ? "bg-slate-950/50 border-sky-500/20 text-slate-200"
                                            : "bg-sky-50/80 border-sky-200 text-slate-700"
                                    }`}>
                                        <span className="font-semibold text-sky-400 mr-1">
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
                            <div className={`px-4 py-2.5 rounded-2xl rounded-bl-md text-sm ${
                                darkMode ? "bg-white/[0.08] text-white" : "bg-slate-100 text-slate-800"
                            }`}>
                                상대 입력 중 <span className="animate-pulse">…</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className={`p-2.5 sm:p-4 backdrop-blur-sm border-t ${
                    darkMode ? "bg-white/[0.04] border-white/[0.06]" : "bg-white/70 border-sky-100/50"
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
                    title={game.playerWon ? "승리!" : "게임 오버"}
                    badge={game.playerWon ? <p className="text-amber-400 font-bold text-sm mb-3 animate-bounce">★</p> : undefined}
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
