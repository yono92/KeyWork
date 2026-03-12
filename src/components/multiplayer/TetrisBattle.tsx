"use client";

import React, { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useResponsiveTetrisSize } from "@/hooks/useResponsiveTetrisSize";
import { useTetrisAnimations } from "@/hooks/useTetrisAnimations";
import { useTetrisEngine, CELL_COLORS, BOARD_WIDTH } from "@/hooks/useTetrisEngine";
import { useMultiplayerTetris, deserializeBoard } from "@/hooks/useMultiplayerTetris";

import { useScoreSubmit } from "@/hooks/useScoreSubmit";
import { useAuthContext } from "@/components/auth/AuthProvider";
import useTypingStore from "@/store/store";
import type { AvatarConfig } from "@/lib/supabase/types";
import PixelAvatar from "@/components/avatar/PixelAvatar";

interface TetrisBattleProps {
    getChannel: () => RealtimeChannel | null;
    roomId: string;
    isHost: boolean;
    opponentNickname: string;
    opponentAvatarConfig: AvatarConfig | null;
    onFinish: () => void;
}

export default function TetrisBattle({ getChannel, opponentNickname, opponentAvatarConfig, onFinish }: TetrisBattleProps) {
    const { submitScore } = useScoreSubmit();
    const { user, profile } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";
    const { sectionRef, cellSize, isMobile } = useResponsiveTetrisSize();
    const anim = useTetrisAnimations(true);
    const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const gameEndedRef = useRef(false);

    const onLinesCleared = useCallback((_rows: number[], _removed: number, totalGain: number, newCombo: number) => {
        anim.triggerScorePop();
        anim.addFloatingText(`+${totalGain}`, "var(--retro-game-warning)");
        if (newCombo >= 2) anim.addFloatingText(`COMBO x${newCombo}`, "var(--retro-game-info)");
        // 가비지 전송은 아래 effect에서 처리
    }, [anim]);

    const onHardDrop = useCallback((distance: number) => {
        if (distance > 2) anim.triggerShake();
    }, [anim]);

    const onGameOver = useCallback(() => {
        // 게임 오버 처리는 아래 effect에서
    }, []);

    const engine = useTetrisEngine({ onLinesCleared, onHardDrop, onGameOver }, isMobile);
    const mp = useMultiplayerTetris(getChannel, engine.running, user?.id ?? "");

    // 자동 시작
    useEffect(() => {
        engine.resetGame();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 300ms마다 보드 브로드캐스트
    useEffect(() => {
        if (!engine.running) return;
        broadcastIntervalRef.current = setInterval(() => {
            mp.broadcastBoard(engine.board, engine.score, engine.lines, engine.level, engine.gameOver);
        }, 300);
        return () => {
            if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
        };
    }, [engine.running, engine.board, engine.score, engine.lines, engine.level, engine.gameOver, mp]);

    // 라인 클리어 시 가비지 전송
    const prevLinesRef = useRef(engine.lines);
    useEffect(() => {
        const diff = engine.lines - prevLinesRef.current;
        if (diff > 0) mp.sendGarbage(diff);
        prevLinesRef.current = engine.lines;
    }, [engine.lines, mp]);

    // 수신한 가비지 라인을 보드에 적용 (0.5초 딜레이)
    useEffect(() => {
        if (mp.pendingGarbage <= 0 || engine.gameOver || !engine.running) return;
        const timer = setTimeout(() => {
            const garbageLines = mp.consumeGarbage();
            if (garbageLines) {
                engine.applyGarbage(garbageLines);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [mp.pendingGarbage, mp, engine]);

    // 게임 오버 처리
    useEffect(() => {
        if (engine.gameOver && !gameEndedRef.current) {
            gameEndedRef.current = true;
            mp.broadcastBoard(engine.board, engine.score, engine.lines, engine.level, true);

            // 점수 제출
            submitScore({
                game_mode: "tetris",
                score: engine.score,
                lines: engine.lines,
                is_multiplayer: true,
                is_win: false,
            });
        }
    }, [engine.gameOver, engine.board, engine.score, engine.lines, engine.level, mp, submitScore]);

    // 상대 게임 오버 감지 (내가 승리)
    useEffect(() => {
        if (mp.opponent.gameOver && !engine.gameOver && !gameEndedRef.current) {
            gameEndedRef.current = true;
            submitScore({
                game_mode: "tetris",
                score: engine.score,
                lines: engine.lines,
                is_multiplayer: true,
                is_win: true,
            });
        }
    }, [mp.opponent.gameOver, engine.gameOver, engine.score, engine.lines, submitScore]);

    const miniCellSize = Math.max(4, Math.floor(cellSize * 0.35));
    const isFinished = engine.gameOver || mp.opponent.gameOver;
    const iWon = mp.opponent.gameOver && !engine.gameOver;

    const renderMiniBoard = () => {
        const board = deserializeBoard(mp.opponent.board);
        return (
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${miniCellSize}px)`,
                    gap: 0,
                    background: "var(--retro-game-bg)",
                    border: "2px solid var(--retro-game-panel-border-lo)",
                }}
            >
                {board.flatMap((row, ri) =>
                    row.map((cell, ci) => (
                        <div
                            key={`${ri}-${ci}`}
                            style={{
                                width: miniCellSize,
                                height: miniCellSize,
                                background: cell ? CELL_COLORS[cell].face : "var(--retro-game-bg)",
                            }}
                        />
                    )),
                )}
            </div>
        );
    };

    return (
        <section ref={sectionRef} className="w-full mx-auto h-full min-h-0 overflow-hidden flex flex-col gap-2" style={{ color: "var(--retro-game-text)" }}>
            <div className="mx-auto w-fit max-w-full min-h-0 flex-1">
                <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
                    {/* 내 보드 (기존 TetrisGame 렌더링 간소화) */}
                    <div>
                        <div style={{ textAlign: "center", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <PixelAvatar config={profile?.avatar_config ?? null} nickname={profile?.nickname ?? "?"} size="sm" />
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--retro-game-info)" }}>
                                {ko ? "나" : "YOU"}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 900, marginLeft: 4, color: "var(--retro-game-warning)" }}>
                                {engine.score.toLocaleString()}
                            </span>
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${cellSize}px)`,
                                gap: 0,
                                background: "var(--retro-game-bg)",
                                border: "3px solid var(--retro-game-panel-border-lo)",
                                position: "relative",
                            }}
                        >
                            {engine.renderedBoard.flatMap((row, ri) =>
                                row.map((cell, ci) => {
                                    const key = `${ri}-${ci}`;
                                    if (cell) {
                                        const c = CELL_COLORS[cell];
                                        return (
                                            <div key={key} style={{
                                                width: cellSize, height: cellSize,
                                                background: c.face,
                                                borderStyle: "solid", borderWidth: "2px",
                                                borderTopColor: c.hi, borderLeftColor: c.hi,
                                                borderBottomColor: c.lo, borderRightColor: c.lo,
                                            }} />
                                        );
                                    }
                                    return (
                                        <div key={key} style={{
                                            width: cellSize, height: cellSize,
                                            background: "var(--retro-game-bg)",
                                            borderRight: "1px solid var(--retro-game-grid)",
                                            borderBottom: "1px solid var(--retro-game-grid)",
                                        }} />
                                    );
                                }),
                            )}
                            {mp.pendingGarbage > 0 && (
                                <div style={{
                                    position: "absolute", bottom: 0, left: 0, width: 4,
                                    height: mp.pendingGarbage * cellSize,
                                    background: "var(--retro-game-danger)",
                                    animation: "tetris-blink 0.5s step-end infinite",
                                }} />
                            )}
                        </div>
                    </div>

                    {/* 상대 미니맵 */}
                    <div>
                        <div style={{ textAlign: "center", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <PixelAvatar config={opponentAvatarConfig} nickname={opponentNickname} size="sm" />
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--retro-game-danger)" }}>
                                {ko ? "상대" : "OPP"}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 900, marginLeft: 4, color: "var(--retro-game-warning)" }}>
                                {mp.opponent.score.toLocaleString()}
                            </span>
                        </div>
                        {renderMiniBoard()}
                        <div style={{ textAlign: "center", marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: "var(--retro-game-text-dim)" }}>
                                LV.{mp.opponent.level} | L:{mp.opponent.lines}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 결과 오버레이 */}
                {isFinished && (
                    <div style={{
                        position: "fixed", inset: 0, zIndex: 50,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
                    }}>
                        <div style={{ textAlign: "center" }}>
                            <p style={{
                                fontSize: 36, fontWeight: 900, letterSpacing: 6,
                                color: iWon ? "var(--retro-game-success)" : "var(--retro-game-danger)",
                                textShadow: "2px 2px 0 #000",
                            }}>
                                {iWon ? (ko ? "승리!" : "WIN!") : (ko ? "패배" : "LOSE")}
                            </p>
                            <p style={{ color: "var(--retro-game-text)", fontSize: 14, marginTop: 8 }}>
                                {ko ? "점수" : "Score"}: {engine.score.toLocaleString()}
                            </p>
                            <button
                                onClick={onFinish}
                                style={{
                                    marginTop: 16, padding: "8px 24px",
                                    background: "var(--retro-game-panel)", color: "var(--retro-game-text)",
                                    fontWeight: 900, fontSize: 14, letterSpacing: 2, cursor: "pointer",
                                    borderStyle: "solid", borderWidth: "3px",
                                    borderTopColor: "var(--retro-game-panel-border-hi)",
                                    borderLeftColor: "var(--retro-game-panel-border-hi)",
                                    borderBottomColor: "var(--retro-game-panel-border-lo)",
                                    borderRightColor: "var(--retro-game-panel-border-lo)",
                                }}
                            >
                                {ko ? "로비로" : "LOBBY"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
