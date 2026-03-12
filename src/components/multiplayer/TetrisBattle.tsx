"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useResponsiveTetrisSize } from "@/hooks/useResponsiveTetrisSize";
import { useTetrisAnimations } from "@/hooks/useTetrisAnimations";
import { useTetrisEngine, CELL_COLORS, BOARD_WIDTH } from "@/hooks/useTetrisEngine";
import { useMultiplayerTetris, deserializeBoard } from "@/hooks/useMultiplayerTetris";
import { useScoreSubmit } from "@/hooks/useScoreSubmit";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import useTypingStore from "@/store/store";
import PixelAvatar from "@/components/avatar/PixelAvatar";
import RoomReadyPanel from "@/components/multiplayer/RoomReadyPanel";
import { shouldResetForMatchStart } from "@/lib/multiplayerRealtime";

interface TetrisBattleProps {
    room: ReturnType<typeof useMultiplayerRoom>;
    onFinish: () => void;
}

export default function TetrisBattle({ room, onFinish }: TetrisBattleProps) {
    const { submitScore } = useScoreSubmit();
    const { user, profile } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";
    const { sectionRef, cellSize, isMobile } = useResponsiveTetrisSize();
    const anim = useTetrisAnimations(true);
    const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevPhaseRef = useRef<string | null>(null);
    const scoreSubmittedRef = useRef(false);
    const liveMatchRef = useRef(false);

    const onLinesCleared = useCallback((_rows: number[], _removed: number, totalGain: number, newCombo: number) => {
        anim.triggerScorePop();
        anim.addFloatingText(`+${totalGain}`, "var(--retro-game-warning)");
        if (newCombo >= 2) anim.addFloatingText(`COMBO x${newCombo}`, "var(--retro-game-info)");
    }, [anim]);

    const onHardDrop = useCallback((distance: number) => {
        if (distance > 2) anim.triggerShake();
    }, [anim]);

    const engine = useTetrisEngine({ onLinesCleared, onHardDrop, onGameOver: () => {} }, isMobile);
    const mp = useMultiplayerTetris(room.getChannel, true, user?.id ?? "");
    const prevLinesRef = useRef(0);

    useEffect(() => {
        engine.resetGame();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!shouldResetForMatchStart(prevPhaseRef.current, room.phase)) {
            prevPhaseRef.current = room.phase;
            return;
        }

        mp.resetState();
        engine.resetGame();
        prevLinesRef.current = 0;
        scoreSubmittedRef.current = false;
        liveMatchRef.current = true;
        prevPhaseRef.current = room.phase;
    }, [engine, mp, room.phase]);

    useEffect(() => {
        if (prevPhaseRef.current !== room.phase) {
            prevPhaseRef.current = room.phase;
        }
    }, [room.phase]);

    useEffect(() => {
        if (room.phase !== "playing") return;

        broadcastIntervalRef.current = setInterval(() => {
            mp.broadcastBoard(engine.board, engine.score, engine.lines, engine.level, engine.gameOver);
        }, 300);

        return () => {
            if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
        };
    }, [engine.board, engine.gameOver, engine.level, engine.lines, engine.score, mp, room.phase]);

    useEffect(() => {
        if (room.phase !== "playing") return;

        const diff = engine.lines - prevLinesRef.current;
        if (diff > 0) mp.sendGarbage(diff);
        prevLinesRef.current = engine.lines;
    }, [engine.lines, mp, room.phase]);

    useEffect(() => {
        if (room.phase !== "playing" || mp.pendingGarbage <= 0 || engine.gameOver || !engine.running) return;

        const timer = setTimeout(() => {
            const garbageLines = mp.consumeGarbage();
            if (garbageLines) {
                engine.applyGarbage(garbageLines);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [engine, mp, room.phase]);

    useEffect(() => {
        if (room.phase !== "playing" || !liveMatchRef.current || !engine.gameOver || !room.opponentUserId) return;
        liveMatchRef.current = false;
        void room.broadcastGameOver(room.opponentUserId);
    }, [engine.gameOver, room]);

    useEffect(() => {
        if (room.phase !== "finished" || !room.error || scoreSubmittedRef.current) return;

        scoreSubmittedRef.current = true;
        void submitScore({
            game_mode: "tetris",
            score: engine.score,
            lines: engine.lines,
            is_multiplayer: true,
            is_win: room.error === "WIN",
        });
    }, [engine.lines, engine.score, room.error, room.phase, submitScore]);

    const miniCellSize = Math.max(4, Math.floor(cellSize * 0.35));
    const showCountdown = room.phase === "countdown";
    const showRoomPanel = room.phase === "waiting";
    const showResult = room.phase === "finished";
    const iWon = room.error === "WIN";

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
        <section ref={sectionRef} className="relative w-full mx-auto h-full min-h-0 overflow-hidden flex flex-col gap-2" style={{ color: "var(--retro-game-text)" }}>
            {showRoomPanel && (
                <RoomReadyPanel
                    room={room}
                    onLeave={onFinish}
                    title={ko ? "테트리스 룸" : "Tetris Room"}
                    description={
                        room.opponentUserId
                            ? ko ? "혼자 연습하다가 Ready를 누르세요. 두 플레이어가 모두 준비되면 새 판으로 시작합니다." : "Practice solo, then hit Ready. The match starts on a fresh board when both players are ready."
                            : ko ? "상대를 기다리는 동안 혼자 보드를 연습할 수 있습니다." : "You can practice solo while waiting for another player."
                    }
                />
            )}

            <div className="mx-auto w-fit max-w-full min-h-0 flex-1">
                <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
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
                                        const color = CELL_COLORS[cell];
                                        return (
                                            <div key={key} style={{
                                                width: cellSize,
                                                height: cellSize,
                                                background: color.face,
                                                borderStyle: "solid",
                                                borderWidth: "2px",
                                                borderTopColor: color.hi,
                                                borderLeftColor: color.hi,
                                                borderBottomColor: color.lo,
                                                borderRightColor: color.lo,
                                            }} />
                                        );
                                    }

                                    return (
                                        <div key={key} style={{
                                            width: cellSize,
                                            height: cellSize,
                                            background: "var(--retro-game-bg)",
                                            borderRight: "1px solid var(--retro-game-grid)",
                                            borderBottom: "1px solid var(--retro-game-grid)",
                                        }} />
                                    );
                                }),
                            )}
                            {room.phase === "playing" && mp.pendingGarbage > 0 && (
                                <div style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    width: 4,
                                    height: mp.pendingGarbage * cellSize,
                                    background: "var(--retro-game-danger)",
                                    animation: "tetris-blink 0.5s step-end infinite",
                                }} />
                            )}
                        </div>
                    </div>

                    <div>
                        <div style={{ textAlign: "center", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <PixelAvatar config={room.opponentAvatarConfig} nickname={room.opponentNickname ?? "?"} size="sm" />
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
                                {room.opponentUserId ? `LV.${mp.opponent.level} | L:${mp.opponent.lines}` : ko ? "상대 입장 전" : "Waiting for opponent"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {showCountdown && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 40,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
                }}>
                    <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--retro-game-text)", marginBottom: 12 }}>
                            {ko ? "새 판으로 시작합니다" : "Starting fresh board"}
                        </p>
                        <p style={{
                            fontSize: 56, fontWeight: 900, letterSpacing: 4,
                            color: "var(--retro-game-warning)", textShadow: "2px 2px 0 #000",
                        }}>
                            {room.countdown}
                        </p>
                    </div>
                </div>
            )}

            {showResult && (
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
        </section>
    );
}
