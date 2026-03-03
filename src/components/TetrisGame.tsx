"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useResponsiveTetrisSize } from "../hooks/useResponsiveTetrisSize";
import { useTetrisAnimations } from "../hooks/useTetrisAnimations";
import { useTetrisEngine, PIECES, CELL_COLORS, BOARD_WIDTH, BOARD_HEIGHT } from "../hooks/useTetrisEngine";
import type { PieceType } from "../hooks/useTetrisEngine";

export default function TetrisGame() {
    const [animEnabled, setAnimEnabled] = useState(true);

    const { sectionRef, cellSize, miniCellSize, sidePanelWidth, isMobile } = useResponsiveTetrisSize();
    const anim = useTetrisAnimations(animEnabled);
    const prevLevelRef = useRef(1);

    const onLinesCleared = useCallback((rows: number[], _removed: number, totalGain: number, newCombo: number) => {
        anim.triggerFlash(rows);
        anim.triggerScorePop();
        anim.addFloatingText(`+${totalGain}`, "#ffe000");

        // Clear type labels
        const lineCount = rows.length;
        if (lineCount === 2) {
            anim.triggerClearLabel("DOUBLE");
        } else if (lineCount === 3) {
            anim.triggerClearLabel("TRIPLE");
        } else if (lineCount >= 4) {
            anim.triggerClearLabel("TETRIS!");
            anim.triggerScreenFlash();
        }

        if (newCombo >= 2) {
            anim.addFloatingText(`COMBO x${newCombo}`, "#00e5ff");
        }
        // Auto shake on combo 3+
        if (newCombo >= 3) {
            anim.triggerShake();
        }
    }, [anim]);

    const onHardDrop = useCallback((distance: number, landingRow: number) => {
        anim.setHardDropDistance(distance);
        anim.triggerShake();
        if (animEnabled && distance > 2) {
            anim.setImpactRow(landingRow);
            setTimeout(() => anim.setImpactRow(null), 400);
        }
    }, [anim, animEnabled]);

    const onGameOver = useCallback(() => {
        // No-op — game over visual is handled in render
    }, []);

    const engine = useTetrisEngine({ onLinesCleared, onHardDrop, onGameOver }, isMobile);

    // Level-up glow effect
    useEffect(() => {
        if (engine.level > prevLevelRef.current && engine.running) {
            anim.triggerLevelGlow();
        }
        prevLevelRef.current = engine.level;
    }, [engine.level, engine.running, anim]);

    const controlsDisabled = !engine.running || engine.paused || engine.gameOver || engine.clearing;
    const boardPx = cellSize * BOARD_WIDTH;

    const bevel = (inset = false) => ({
        borderStyle: "solid" as const,
        borderWidth: "2px",
        borderTopColor: inset ? "#222" : "#fff",
        borderLeftColor: inset ? "#222" : "#fff",
        borderBottomColor: inset ? "#fff" : "#222",
        borderRightColor: inset ? "#fff" : "#222",
    });

    const blockStyle = (type: PieceType): React.CSSProperties => {
        const c = CELL_COLORS[type];
        return {
            width: cellSize, height: cellSize,
            background: c.face,
            borderStyle: "solid",
            borderWidth: "2px",
            borderTopColor: c.hi,
            borderLeftColor: c.hi,
            borderBottomColor: c.lo,
            borderRightColor: c.lo,
            imageRendering: "pixelated",
        };
    };

    const renderMiniPreview = (pieceType: PieceType | null) => {
        const sz = miniCellSize;
        return (
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(4, ${sz}px)`,
                    gap: 0,
                    background: "#0a0a0a",
                    padding: 2,
                    width: "fit-content",
                    margin: "0 auto",
                    ...bevel(true),
                }}
            >
                {Array.from({ length: 16 }).map((_, idx) => {
                    const x = idx % 4;
                    const y = Math.floor(idx / 4);
                    const filled =
                        pieceType !== null &&
                        PIECES[pieceType][0].some(([dx, dy]) => dx === x && dy === y);
                    if (filled && pieceType) {
                        const c = CELL_COLORS[pieceType];
                        return (
                            <div
                                key={idx}
                                style={{
                                    width: sz, height: sz,
                                    background: c.face,
                                    borderStyle: "solid",
                                    borderWidth: "1px",
                                    borderTopColor: c.hi,
                                    borderLeftColor: c.hi,
                                    borderBottomColor: c.lo,
                                    borderRightColor: c.lo,
                                }}
                                aria-hidden="true"
                            />
                        );
                    }
                    return (
                        <div
                            key={idx}
                            style={{ width: sz, height: sz, background: "#111" }}
                            aria-hidden="true"
                        />
                    );
                })}
            </div>
        );
    };

    const shakeAnim = anim.shaking
        ? anim.hardDropDistance > 6
            ? "tetris-hard-shake 0.25s ease-out"
            : anim.hardDropDistance > 2
                ? "tetris-hard-shake 0.2s ease-out"
                : "tetris-shake 0.18s ease-out"
        : undefined;

    const ghostType = engine.activePiece.type;

    const renderBoard = () => (
        <div
            style={{
                position: "relative",
                alignSelf: "start",
                width: "fit-content",
                margin: "0 auto",
                animation: shakeAnim,
            }}
        >
            <div
                style={{
                    padding: 4,
                    background: "#333",
                    borderStyle: "solid",
                    borderWidth: "3px",
                    borderTopColor: "#666",
                    borderLeftColor: "#666",
                    borderBottomColor: "#111",
                    borderRightColor: "#111",
                    animation: anim.levelGlow ? "tetris-level-glow 0.6s ease-out" : undefined,
                }}
            >
                <div style={{ padding: 1, background: "#000", ...bevel(true) }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${cellSize}px)`,
                            gap: 0,
                            width: boardPx,
                            background: "#0a0a0a",
                        }}
                    >
                        {engine.renderedBoard.flatMap((row, ri) =>
                            row.map((cell, ci) => {
                                const key = `${ri}-${ci}`;
                                const isFlash = anim.flashRows.includes(ri);

                                if (isFlash && cell) {
                                    const distFromCenter = Math.abs(ci - (BOARD_WIDTH - 1) / 2);
                                    const delay = distFromCenter * 40;
                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                width: cellSize, height: cellSize,
                                                background: "#fff",
                                                animation: `tetris-line-clear 0.5s ${delay}ms ease-out forwards`,
                                            }}
                                            aria-hidden="true"
                                        />
                                    );
                                }

                                if (cell) {
                                    return <div key={key} style={blockStyle(cell)} aria-hidden="true" />;
                                }

                                if (engine.ghostCells.has(key)) {
                                    const gc = CELL_COLORS[ghostType];
                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                width: cellSize, height: cellSize,
                                                background: "transparent",
                                                boxSizing: "border-box",
                                                border: `1px dashed ${gc.face}66`,
                                            }}
                                            aria-hidden="true"
                                        />
                                    );
                                }

                                return (
                                    <div
                                        key={key}
                                        style={{
                                            width: cellSize, height: cellSize,
                                            background: "#0a0a0a",
                                            borderRight: "1px solid #151515",
                                            borderBottom: "1px solid #151515",
                                        }}
                                        aria-hidden="true"
                                    />
                                );
                            }),
                        )}
                    </div>
                </div>
            </div>

            {anim.impactRow !== null && (
                <div
                    style={{
                        position: "absolute",
                        left: 7,
                        right: 7,
                        top: 7 + anim.impactRow * cellSize + cellSize / 2 - 1,
                        height: 2,
                        background: "linear-gradient(90deg, transparent, #fff, #ffe000, #fff, transparent)",
                        animation: "tetris-impact-line 0.4s ease-out forwards",
                        pointerEvents: "none",
                        zIndex: 5,
                    }}
                />
            )}

            {anim.floatingTexts.map((ft) => {
                const isCombo = ft.text.startsWith("COMBO");
                const comboNum = isCombo ? parseInt(ft.text.replace(/\D/g, "")) || 2 : 0;
                return (
                    <div
                        key={ft.id}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "40%",
                            transform: "translateX(-50%)",
                            color: ft.color,
                            fontSize: isCombo
                                ? Math.max(16, cellSize * 0.8) + comboNum * 2
                                : Math.max(14, cellSize * 0.7),
                            fontWeight: 900,
                            letterSpacing: 2,
                            textShadow: "2px 2px 0 #000, -1px -1px 0 #000",
                            animation: isCombo
                                ? "tetris-combo-pulse 1.2s ease-out forwards"
                                : "tetris-float-up 1s ease-out forwards",
                            pointerEvents: "none",
                            zIndex: 8,
                            whiteSpace: "nowrap",
                            fontFamily: "monospace",
                        }}
                    >
                        {ft.text}
                    </div>
                );
            })}

            {/* Clear label (DOUBLE / TRIPLE / TETRIS!) */}
            {anim.clearLabel && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "30%",
                        transform: "translateX(-50%)",
                        color: anim.clearLabel === "TETRIS!" ? "#ffd700" : "#fff",
                        fontSize: anim.clearLabel === "TETRIS!" ? Math.max(24, cellSize * 1.4) : Math.max(18, cellSize * 1),
                        fontWeight: 900,
                        letterSpacing: 4,
                        textShadow: anim.clearLabel === "TETRIS!"
                            ? "0 0 20px #ffd700, 0 0 40px #ff8c00, 2px 2px 0 #000"
                            : "0 0 10px #fff, 2px 2px 0 #000",
                        animation: anim.clearLabel === "TETRIS!"
                            ? "tetris-tetris-clear 1.5s ease-out forwards"
                            : "tetris-float-up 1.2s ease-out forwards",
                        pointerEvents: "none",
                        zIndex: 12,
                        whiteSpace: "nowrap",
                        fontFamily: "monospace",
                    }}
                >
                    {anim.clearLabel}
                </div>
            )}

            {/* Screen flash for TETRIS clear */}
            {anim.screenFlash && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,224,0,0.4))",
                        animation: "game-screen-flash 150ms ease-out forwards",
                        pointerEvents: "none",
                        zIndex: 11,
                    }}
                />
            )}

            {engine.paused && engine.running && !engine.gameOver && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.82)",
                        animation: "tetris-fade-in 0.2s ease-out",
                        zIndex: 10,
                    }}
                >
                    <p style={{ color: "#ffe000", fontSize: 22, fontWeight: 900, letterSpacing: 6, textTransform: "uppercase", animation: "tetris-blink 1s step-end infinite", textShadow: "2px 2px 0 #000" }}>
                        PAUSE
                    </p>
                    <p style={{ color: "#aaa", fontSize: 11, marginTop: 6 }}>P 키로 재개</p>
                    <button
                        onClick={() => engine.setPaused(false)}
                        style={{ ...bevel(), background: "#444", color: "#fff", padding: "6px 20px", cursor: "pointer", marginTop: 12, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
                    >
                        CONTINUE
                    </button>
                </div>
            )}

            {engine.gameOver && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(20,0,0,0.85))",
                            animation: "game-over-curtain 0.8s ease-out forwards",
                            zIndex: 9,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            animation: "tetris-fade-in 0.5s 0.3s ease-out both",
                            zIndex: 10,
                        }}
                    >
                        <p style={{ color: "#ff3333", fontSize: 22, fontWeight: 900, letterSpacing: 4, textShadow: "0 0 20px rgba(255,51,51,0.5), 2px 2px 0 #000" }}>
                            GAME OVER
                        </p>
                        <p style={{ color: "#ccc", fontSize: 13, marginTop: 4 }}>
                            SCORE: {engine.score.toLocaleString()}
                        </p>
                        <button
                            onClick={engine.resetGame}
                            style={{ ...bevel(), background: "#444", color: "#fff", padding: "6px 20px", cursor: "pointer", marginTop: 12, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
                        >
                            RETRY
                        </button>
                    </div>
                </>
            )}

            {!engine.running && !engine.gameOver && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.88)",
                        zIndex: 10,
                    }}
                >
                    <p style={{ color: "#00e5ff", fontSize: 26, fontWeight: 900, letterSpacing: 6, textShadow: "2px 2px 0 #000", marginBottom: 6 }}>
                        TETRIS
                    </p>
                    <p style={{ color: "#777", fontSize: 11, marginBottom: 14, animation: "tetris-blink 1.2s step-end infinite" }}>
                        PRESS START
                    </p>
                    <button
                        onClick={engine.resetGame}
                        style={{ ...bevel(), background: "#cc3300", color: "#fff", padding: "8px 28px", fontSize: 14, fontWeight: 900, letterSpacing: 3, cursor: "pointer" }}
                    >
                        START
                    </button>
                </div>
            )}
        </div>
    );

    const sp = Math.max(0.6, cellSize / 22);
    const spFont = (base: number) => Math.round(base * sp);
    const spPad = (base: number) => Math.round(base * sp);

    const renderStatRow = (label: string, value: number, pop = false) => (
        <div
            style={{
                ...bevel(true),
                background: "#111",
                padding: `${spPad(4)}px ${spPad(8)}px`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <span style={{ color: "#888", fontSize: spFont(11), textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
            <span
                style={{
                    color: "#ffe000",
                    fontSize: spFont(16),
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                    animation: pop && anim.scorePop ? "tetris-score-pop 0.3s ease-out" : undefined,
                }}
            >
                {value.toLocaleString()}
            </span>
        </div>
    );

    const boardTotalH = cellSize * BOARD_HEIGHT + 20;

    const renderSidePanel = () => {
        const gap = Math.max(2, spPad(4));
        return (
            <div style={{ display: "flex", flexDirection: "column", gap, maxHeight: boardTotalH, overflow: "hidden" }}>
                <div style={{ ...bevel(), background: "#333", padding: spPad(5) }}>
                    <p style={{ fontSize: spFont(10), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", textAlign: "center", marginBottom: spPad(3) }}>
                        NEXT
                    </p>
                    {renderMiniPreview(engine.nextPieceType)}
                </div>

                <div style={{ ...bevel(), background: "#333", padding: spPad(5) }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spPad(3) }}>
                        <p style={{ fontSize: spFont(10), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#aaa" }}>
                            HOLD <span style={{ fontSize: spFont(8), color: "#666", fontWeight: 400 }}>[C]</span>
                        </p>
                        {engine.holdUsedThisTurn && (
                            <span style={{ fontSize: spFont(8), color: "#ff3333", fontWeight: 700 }}>LOCK</span>
                        )}
                    </div>
                    {renderMiniPreview(engine.heldPieceType)}
                </div>

                <div style={{ ...bevel(), background: "#333", padding: spPad(5), display: "flex", flexDirection: "column", gap: spPad(2) }}>
                    {renderStatRow("SCORE", engine.score, true)}
                    {renderStatRow("LINES", engine.lines)}
                    {renderStatRow("LEVEL", engine.level)}
                    <div style={{ ...bevel(true), background: "#111", padding: `${spPad(2)}px ${spPad(8)}px`, textAlign: "center" }}>
                        <span style={{ color: "#555", fontSize: spFont(9) }}>SPEED {engine.dropIntervalMs}ms</span>
                    </div>
                </div>

                {engine.combo >= 2 && (
                    <div style={{
                        ...bevel(),
                        background: "#1a1a2a",
                        padding: `${spPad(4)}px ${spPad(8)}px`,
                        textAlign: "center",
                    }}>
                        <span style={{
                            color: "#00e5ff",
                            fontSize: spFont(14),
                            fontWeight: 900,
                            letterSpacing: 2,
                            textShadow: "0 0 6px #00e5ff66",
                            fontFamily: "monospace",
                        }}>
                            COMBO x{engine.combo}
                        </span>
                    </div>
                )}

                {!isMobile && (
                    <div
                        style={{
                            borderStyle: "solid",
                            borderWidth: "2px",
                            borderTopColor: "#666",
                            borderLeftColor: "#666",
                            borderBottomColor: "#111",
                            borderRightColor: "#111",
                            background: "#2a2a2a",
                            padding: 0,
                        }}
                    >
                        <div
                            style={{
                                background: "#1a2a1a",
                                ...bevel(true),
                                padding: `${spPad(4)}px ${spPad(6)}px`,
                            }}
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: `${spPad(1)}px ${spPad(6)}px`, alignItems: "center" }}>
                                {[
                                    ["← →", "이동"],
                                    ["↑ ↓", "회전/내리기"],
                                    ["SPC", "드롭"],
                                    ["C/P", "홀드/정지"],
                                ].map(([k, v]) => (
                                    <React.Fragment key={k}>
                                        <span style={{ color: "#33ff33", fontSize: spFont(10), fontWeight: 900, fontFamily: "monospace", textAlign: "right", textShadow: "0 0 4px #33ff3388", lineHeight: 1.3 }}>
                                            {k}
                                        </span>
                                        <span style={{ color: "#33ff3399", fontSize: spFont(9), fontFamily: "monospace", lineHeight: 1.3 }}>
                                            {v}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                            <button
                                onClick={() => setAnimEnabled((v) => !v)}
                                style={{
                                    width: "100%",
                                    marginTop: spPad(4),
                                    height: spPad(18),
                                    fontSize: spFont(9),
                                    fontWeight: 700,
                                    letterSpacing: 2,
                                    fontFamily: "monospace",
                                    ...bevel(animEnabled),
                                    background: animEnabled ? "#1a2a1a" : "#2a2a2a",
                                    color: animEnabled ? "#33ff33" : "#555",
                                    cursor: "pointer",
                                    textShadow: animEnabled ? "0 0 4px #33ff3388" : "none",
                                }}
                            >
                                FX {animEnabled ? "ON" : "OFF"}
                            </button>
                        </div>
                    </div>
                )}

                {isMobile && (
                    <div style={{ ...bevel(), background: "#333", padding: spPad(3) }}>
                        <button
                            onClick={() => setAnimEnabled((v) => !v)}
                            style={{
                                width: "100%",
                                height: spPad(20),
                                fontSize: spFont(9),
                                fontWeight: 700,
                                letterSpacing: 2,
                                fontFamily: "monospace",
                                ...bevel(animEnabled),
                                background: animEnabled ? "#1a2a1a" : "#2a2a2a",
                                color: animEnabled ? "#33ff33" : "#555",
                                cursor: "pointer",
                                textShadow: animEnabled ? "0 0 4px #33ff3388" : "none",
                            }}
                        >
                            FX {animEnabled ? "ON" : "OFF"}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderControlPad = () => {
        const btnH = 44;
        const dpadStyle = (disabled: boolean): React.CSSProperties => ({
            height: btnH,
            fontSize: 20,
            fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
            background: disabled ? "#3a3a3a" : "#666",
            color: disabled ? "#555" : "#fff",
            borderStyle: "solid",
            borderWidth: "3px",
            borderTopColor: disabled ? "#444" : "#999",
            borderLeftColor: disabled ? "#444" : "#999",
            borderBottomColor: disabled ? "#222" : "#333",
            borderRightColor: disabled ? "#222" : "#333",
        });
        return (
            <div style={{ background: "#444", padding: 6, borderStyle: "solid", borderWidth: "3px", borderTopColor: "#666", borderLeftColor: "#666", borderBottomColor: "#222", borderRightColor: "#222" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                    <div />
                    <button onClick={engine.rotatePiece} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>↑</button>
                    <div />
                    <button onClick={() => engine.moveHorizontal(-1)} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>←</button>
                    <button onClick={engine.softDrop} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>↓</button>
                    <button onClick={() => engine.moveHorizontal(1)} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>→</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 5, marginTop: 5 }}>
                    <button
                        onClick={engine.holdPiece}
                        disabled={controlsDisabled || engine.holdUsedThisTurn}
                        style={{
                            height: btnH,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: 1,
                            cursor: (controlsDisabled || engine.holdUsedThisTurn) ? "not-allowed" : "pointer",
                            background: (controlsDisabled || engine.holdUsedThisTurn) ? "#3a3a3a" : "#3355aa",
                            color: (controlsDisabled || engine.holdUsedThisTurn) ? "#555" : "#fff",
                            borderStyle: "solid",
                            borderWidth: "3px",
                            borderTopColor: (controlsDisabled || engine.holdUsedThisTurn) ? "#444" : "#5588dd",
                            borderLeftColor: (controlsDisabled || engine.holdUsedThisTurn) ? "#444" : "#5588dd",
                            borderBottomColor: (controlsDisabled || engine.holdUsedThisTurn) ? "#222" : "#223377",
                            borderRightColor: (controlsDisabled || engine.holdUsedThisTurn) ? "#222" : "#223377",
                        }}
                    >
                        HOLD
                    </button>
                    <button
                        onClick={engine.hardDrop}
                        disabled={controlsDisabled}
                        style={{
                            height: btnH,
                            fontSize: 13,
                            fontWeight: 900,
                            letterSpacing: 3,
                            cursor: controlsDisabled ? "not-allowed" : "pointer",
                            background: controlsDisabled ? "#3a3a3a" : "#cc3300",
                            color: controlsDisabled ? "#555" : "#fff",
                            borderStyle: "solid",
                            borderWidth: "3px",
                            borderTopColor: controlsDisabled ? "#444" : "#ff6644",
                            borderLeftColor: controlsDisabled ? "#444" : "#ff6644",
                            borderBottomColor: controlsDisabled ? "#222" : "#881100",
                            borderRightColor: controlsDisabled ? "#222" : "#881100",
                        }}
                    >
                        DROP
                    </button>
                    <button
                        onClick={() => { if (engine.running && !engine.gameOver) engine.setPaused((v) => !v); }}
                        disabled={!engine.running || engine.gameOver}
                        style={{
                            height: btnH,
                            fontSize: 14,
                            fontWeight: 900,
                            cursor: (!engine.running || engine.gameOver) ? "not-allowed" : "pointer",
                            background: (!engine.running || engine.gameOver) ? "#3a3a3a" : engine.paused ? "#997700" : "#666",
                            color: (!engine.running || engine.gameOver) ? "#555" : engine.paused ? "#fff" : "#fff",
                            borderStyle: "solid",
                            borderWidth: "3px",
                            borderTopColor: (!engine.running || engine.gameOver) ? "#444" : engine.paused ? "#ccaa22" : "#999",
                            borderLeftColor: (!engine.running || engine.gameOver) ? "#444" : engine.paused ? "#ccaa22" : "#999",
                            borderBottomColor: (!engine.running || engine.gameOver) ? "#222" : engine.paused ? "#554400" : "#333",
                            borderRightColor: (!engine.running || engine.gameOver) ? "#222" : engine.paused ? "#554400" : "#333",
                        }}
                    >
                        {engine.paused ? "▶" : "⏸"}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <section
            ref={sectionRef}
            className="w-full mx-auto h-full min-h-0 overflow-hidden flex flex-col gap-2"
            style={{ color: "#ddd", fontFamily: "inherit" }}
        >
            <div className="mx-auto w-fit max-w-full min-h-0 flex-1">
                {isMobile ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: `${boardPx + 14}px ${sidePanelWidth}px`,
                                alignItems: "start",
                                gap: 8,
                            }}
                        >
                            {renderBoard()}
                            {renderSidePanel()}
                        </div>
                        {renderControlPad()}
                    </div>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: `${boardPx + 14}px ${sidePanelWidth}px`,
                            alignItems: "start",
                            gap: 12,
                        }}
                    >
                        {renderBoard()}
                        {renderSidePanel()}
                    </div>
                )}
            </div>
        </section>
    );
}
