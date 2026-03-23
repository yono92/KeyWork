"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useResponsiveTetrisSize } from "../hooks/useResponsiveTetrisSize";
import { useTetrisAnimations } from "../hooks/useTetrisAnimations";
import { useTetrisEngine, PIECES, CELL_COLORS, BOARD_WIDTH, BOARD_HEIGHT } from "../hooks/useTetrisEngine";
import type { PieceType } from "../hooks/useTetrisEngine";
import { GRAIN_SCALE, SAND_COLS, SAND_ROWS } from "../lib/sandPhysics";
import type { SandGrid } from "../lib/sandPhysics";
import useTypingStore from "../store/store";

// ─── Canvas 드로잉 유틸 ───

function adjustColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, Math.round(r * factor))},${Math.min(255, Math.round(g * factor))},${Math.min(255, Math.round(b * factor))})`;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
}

function drawSandGrains(ctx: CanvasRenderingContext2D, grid: SandGrid, grainPx: number) {
    // 고해상도 모래: fillRect로 빠르게 렌더링 (arc는 51K+ 호출 시 느림)
    const shrink = grainPx * 0.15; // 알갱이 간 미세 틈
    for (let y = 0; y < SAND_ROWS; y++) {
        const row = grid[y];
        for (let x = 0; x < SAND_COLS; x++) {
            const g = row[x];
            if (g === null) continue;
            const c = CELL_COLORS[g];
            const hash = (y * 31 + x * 17 + y * x * 7) & 0xff;
            const brightness = 0.75 + (hash % 40) / 100;
            ctx.fillStyle = adjustColor(c.face, brightness);
            ctx.fillRect(
                x * grainPx + shrink,
                y * grainPx + shrink,
                grainPx - shrink * 2,
                grainPx - shrink * 2,
            );
        }
    }
}

function drawFlashGrid(ctx: CanvasRenderingContext2D, flashGrid: Uint8Array | null, grainPx: number) {
    if (!flashGrid) return;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (let y = 0; y < SAND_ROWS; y++) {
        for (let x = 0; x < SAND_COLS; x++) {
            if (flashGrid[y * SAND_COLS + x]) {
                ctx.fillRect(x * grainPx, y * grainPx, grainPx, grainPx);
            }
        }
    }
}

function drawActivePiece(
    ctx: CanvasRenderingContext2D,
    type: PieceType,
    rotation: number,
    px: number,
    py: number,
    cellSize: number,
) {
    const c = CELL_COLORS[type];
    const bw = Math.max(1, Math.floor(cellSize * 0.08));
    for (const [dx, dy] of PIECES[type][rotation]) {
        const x = (px + dx) * cellSize;
        const y = (py + dy) * cellSize;
        if (y + cellSize < 0) continue;
        // 메인 색상
        ctx.fillStyle = c.face;
        ctx.fillRect(x, y, cellSize, cellSize);
        // 하이라이트 (위/왼쪽)
        ctx.fillStyle = c.hi;
        ctx.fillRect(x, y, cellSize, bw);
        ctx.fillRect(x, y, bw, cellSize);
        // 그림자 (아래/오른쪽)
        ctx.fillStyle = c.lo;
        ctx.fillRect(x, y + cellSize - bw, cellSize, bw);
        ctx.fillRect(x + cellSize - bw, y, bw, cellSize);
        // 내부 하이라이트
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x + bw, y + bw, cellSize - bw * 2, cellSize - bw * 2);
    }
}

function drawGhostPiece(
    ctx: CanvasRenderingContext2D,
    type: PieceType,
    rotation: number,
    px: number,
    ghostY: number,
    cellSize: number,
) {
    const c = CELL_COLORS[type];
    ctx.strokeStyle = `${c.face}55`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (const [dx, dy] of PIECES[type][rotation]) {
        const x = (px + dx) * cellSize;
        const y = (ghostY + dy) * cellSize;
        if (y + cellSize < 0) continue;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    }
    ctx.setLineDash([]);
}

// ─── 컴포넌트 ───

export default function TetrisGame() {
    const animEnabled = useTypingStore((s) => s.fxEnabled);
    const { sectionRef, cellSize, miniCellSize, sidePanelWidth, isMobile } = useResponsiveTetrisSize();
    const anim = useTetrisAnimations(animEnabled);
    const prevLevelRef = useRef(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const onLinesCleared = useCallback((rows: number[], _removed: number, totalGain: number, newCombo: number) => {
        anim.triggerScorePop();
        anim.addFloatingText(`+${totalGain}`, "var(--retro-game-warning)");
        const lineCount = _removed;
        if (lineCount === 2) anim.triggerClearLabel("DOUBLE");
        else if (lineCount === 3) anim.triggerClearLabel("TRIPLE");
        else if (lineCount >= 4) { anim.triggerClearLabel("TETRIS!"); anim.triggerScreenFlash(); }
        if (newCombo >= 2) anim.addFloatingText(`COMBO x${newCombo}`, "var(--retro-game-info)");
        if (newCombo >= 3) anim.triggerShake();
    }, [anim]);

    const onHardDrop = useCallback((distance: number, landingRow: number) => {
        anim.setHardDropDistance(distance);
        anim.triggerShake();
        if (animEnabled && distance > 2) {
            anim.setImpactRow(landingRow);
            setTimeout(() => anim.setImpactRow(null), 400);
        }
    }, [anim, animEnabled]);

    const onGameOver = useCallback(() => {}, []);

    const engine = useTetrisEngine({ onLinesCleared, onHardDrop, onGameOver }, isMobile);

    // 레벨업 글로우
    useEffect(() => {
        if (engine.level > prevLevelRef.current && engine.running) anim.triggerLevelGlow();
        prevLevelRef.current = engine.level;
    }, [engine.level, engine.running, anim]);

    const controlsDisabled = !engine.running || engine.paused || engine.gameOver || engine.settling;
    const boardPx = cellSize * BOARD_WIDTH;
    const boardH = cellSize * BOARD_HEIGHT;

    // ─── RAF: tick + Canvas 드로잉 ───
    const tickRef = useRef(engine.tick);
    const cellSizeRef = useRef(cellSize);
    tickRef.current = engine.tick;
    cellSizeRef.current = cellSize;

    useEffect(() => {
        let frameId = 0;
        let lastTime = 0;

        const loop = (time: number) => {
            const dt = lastTime ? Math.min(time - lastTime, 100) : 16;
            lastTime = time;

            tickRef.current(dt);

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (ctx && canvas) {
                const cs = cellSizeRef.current;
                const gp = cs / GRAIN_SCALE;
                const dpr = window.devicePixelRatio || 1;
                const w = BOARD_WIDTH * cs;
                const h = BOARD_HEIGHT * cs;

                // Canvas 크기 동기화
                if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
                    canvas.width = Math.round(w * dpr);
                    canvas.height = Math.round(h * dpr);
                    canvas.style.width = `${w}px`;
                    canvas.style.height = `${h}px`;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }

                const s = engine.gsRef.current;

                // 배경 + 그리드
                drawBackground(ctx, w, h);
                // 모래 알갱이
                drawSandGrains(ctx, s.sandGrid, gp);
                // 플래시 행
                drawFlashGrid(ctx, s.flashGrid, gp);
                // 고스트 피스
                if (s.activePiece && s.running && !s.gameOver && !s.settling) {
                    drawGhostPiece(ctx, s.activePiece.type, s.activePiece.rotation, s.activePiece.x, s.ghostY, cs);
                }
                // 활성 피스
                if (s.activePiece && s.running && !s.gameOver) {
                    drawActivePiece(ctx, s.activePiece.type, s.activePiece.rotation, s.activePiece.x, s.activePiece.y, cs);
                }
            }

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [engine.gsRef]);

    // ─── 베벨 유틸 ───
    const bevel = (inset = false) => ({
        borderStyle: "solid" as const,
        borderWidth: "2px",
        borderTopColor: inset ? "#1a1a20" : "#666670",
        borderLeftColor: inset ? "#1a1a20" : "#666670",
        borderBottomColor: inset ? "#666670" : "#1a1a20",
        borderRightColor: inset ? "#666670" : "#1a1a20",
    });

    // ─── 미니 프리뷰 (NEXT / HOLD) ───
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
                    const filled = pieceType !== null && PIECES[pieceType][0].some(([dx, dy]) => dx === x && dy === y);
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
                                    imageRendering: "pixelated",
                                }}
                                aria-hidden="true"
                            />
                        );
                    }
                    return <div key={idx} style={{ width: sz, height: sz, background: "#111118" }} aria-hidden="true" />;
                })}
            </div>
        );
    };

    // ─── 보드 렌더 (Canvas + 오버레이) ───
    const shakeAnim = anim.shaking
        ? anim.hardDropDistance > 6
            ? "tetris-hard-shake 0.25s ease-out"
            : anim.hardDropDistance > 2
                ? "tetris-hard-shake 0.2s ease-out"
                : "tetris-shake 0.18s ease-out"
        : undefined;

    const renderBoard = () => (
        <div style={{ position: "relative", alignSelf: "start", width: "fit-content", margin: "0 auto", animation: shakeAnim }}>
            <div
                style={{
                    padding: 4,
                    background: "#2a2a30",
                    borderStyle: "solid",
                    borderWidth: "3px",
                    borderTopColor: "#555560",
                    borderLeftColor: "#555560",
                    borderBottomColor: "#111115",
                    borderRightColor: "#111115",
                    animation: anim.levelGlow ? "tetris-level-glow 0.6s ease-out" : undefined,
                }}
            >
                <div style={{ padding: 1, background: "#111115", ...bevel(true) }}>
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: "block",
                            width: boardPx,
                            height: boardH,
                            imageRendering: "pixelated",
                        }}
                    />
                </div>
            </div>

            {/* 임팩트 라인 */}
            {anim.impactRow !== null && (
                <div
                    style={{
                        position: "absolute",
                        left: 7, right: 7,
                        top: 7 + anim.impactRow * cellSize + cellSize / 2 - 1,
                        height: 2,
                        background: "linear-gradient(90deg, transparent, #fff, #ffe000, #fff, transparent)",
                        animation: "tetris-impact-line 0.4s ease-out forwards",
                        pointerEvents: "none",
                        zIndex: 5,
                    }}
                />
            )}

            {/* 플로팅 텍스트 */}
            {anim.floatingTexts.map((ft) => {
                const isCombo = ft.text.startsWith("COMBO");
                const comboNum = isCombo ? parseInt(ft.text.replace(/\D/g, "")) || 2 : 0;
                return (
                    <div
                        key={ft.id}
                        style={{
                            position: "absolute",
                            left: "50%", top: "40%",
                            transform: "translateX(-50%)",
                            color: ft.color,
                            fontSize: isCombo ? Math.max(16, cellSize * 0.8) + comboNum * 2 : Math.max(14, cellSize * 0.7),
                            fontWeight: 900,
                            letterSpacing: 2,
                            textShadow: "2px 2px 0 #000, -1px -1px 0 #000",
                            animation: isCombo ? "tetris-combo-pulse 1.2s ease-out forwards" : "tetris-float-up 1s ease-out forwards",
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

            {/* 클리어 라벨 */}
            {anim.clearLabel && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%", top: "30%",
                        transform: "translateX(-50%)",
                        color: anim.clearLabel === "TETRIS!" ? "var(--retro-game-warning)" : "var(--retro-game-text)",
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

            {/* 스크린 플래시 */}
            {anim.screenFlash && (
                <div
                    style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,224,0,0.4))",
                        animation: "game-screen-flash 150ms ease-out forwards",
                        pointerEvents: "none",
                        zIndex: 11,
                    }}
                />
            )}

            {/* PAUSE 오버레이 */}
            {engine.paused && engine.running && !engine.gameOver && (
                <div
                    style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.82)",
                        animation: "tetris-fade-in 0.2s ease-out",
                        zIndex: 10,
                    }}
                >
                    <p style={{ color: "#e0d080", fontSize: 22, fontWeight: 900, letterSpacing: 6, textTransform: "uppercase", animation: "tetris-blink 1s step-end infinite", textShadow: "2px 2px 0 #000" }}>
                        PAUSE
                    </p>
                    <p style={{ color: "#666670", fontSize: 11, marginTop: 6 }}>P 키로 재개</p>
                    <button
                        onClick={() => engine.setPaused(false)}
                        style={{ ...bevel(), background: "#2a2a30", color: "#ccccdd", padding: "6px 20px", cursor: "pointer", marginTop: 12, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
                    >
                        CONTINUE
                    </button>
                </div>
            )}

            {/* GAME OVER 오버레이 */}
            {engine.gameOver && (
                <>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(20,0,0,0.85))", animation: "game-over-curtain 0.8s ease-out forwards", zIndex: 9 }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "tetris-fade-in 0.5s 0.3s ease-out both", zIndex: 10 }}>
                        <p className="font-pixel" style={{ color: "#cc3333", fontSize: 16, letterSpacing: 4, textShadow: "0 0 20px rgba(255,51,51,0.5), 2px 2px 0 #000" }}>
                            GAME OVER
                        </p>
                        <p className="font-pixel" style={{ color: "#ccccdd", fontSize: 10, marginTop: 8 }}>
                            SCORE: {engine.score.toLocaleString()}
                        </p>
                        <button
                            onClick={engine.resetGame}
                            style={{ ...bevel(), background: "#2a2a30", color: "#ccccdd", padding: "6px 20px", cursor: "pointer", marginTop: 12, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
                        >
                            RETRY
                        </button>
                    </div>
                </>
            )}

            {/* START 오버레이 */}
            {!engine.running && !engine.gameOver && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)", zIndex: 10 }}>
                    <p className="font-pixel" style={{ color: "#44ccff", fontSize: 20, letterSpacing: 6, textShadow: "2px 2px 0 #000, 0 0 10px #2288aa", marginBottom: 6 }}>
                        SANDTRIS
                    </p>
                    <p className="font-pixel" style={{ color: "#666670", fontSize: 8, marginBottom: 14, animation: "tetris-blink 1.2s step-end infinite" }}>
                        PRESS START
                    </p>
                    <button
                        onClick={engine.resetGame}
                        style={{ ...bevel(), background: "#882222", color: "#ccccdd", padding: "8px 28px", fontSize: 14, fontWeight: 900, letterSpacing: 3, cursor: "pointer" }}
                    >
                        START
                    </button>
                </div>
            )}
        </div>
    );

    // ─── 사이드 패널 ───
    const sp = Math.max(0.6, cellSize / 22);
    const spFont = (base: number) => Math.round(base * sp);
    const spPad = (base: number) => Math.round(base * sp);

    const renderStatRow = (label: string, value: number, pop = false) => (
        <div style={{ ...bevel(true), background: "#1a1a22", padding: `${spPad(4)}px ${spPad(8)}px`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-pixel" style={{ color: "#888890", fontSize: spFont(8), textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
            <span style={{ color: "#e0d080", fontSize: spFont(16), fontWeight: 900, fontVariantNumeric: "tabular-nums", fontFamily: "monospace", animation: pop && anim.scorePop ? "tetris-score-pop 0.3s ease-out" : undefined }}>
                {value.toLocaleString()}
            </span>
        </div>
    );

    const boardTotalH = cellSize * BOARD_HEIGHT + 20;

    const renderSidePanel = () => {
        const gap = Math.max(2, spPad(4));
        return (
            <div style={{ display: "flex", flexDirection: "column", gap, maxHeight: boardTotalH, overflow: "hidden" }}>
                <div style={{ ...bevel(), background: "#2a2a30", padding: spPad(5) }}>
                    <p className="font-pixel" style={{ fontSize: spFont(8), letterSpacing: 2, textTransform: "uppercase", color: "#888890", textAlign: "center", marginBottom: spPad(3) }}>NEXT</p>
                    {renderMiniPreview(engine.nextPieceType)}
                </div>

                <div style={{ ...bevel(), background: "#2a2a30", padding: spPad(5) }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spPad(3) }}>
                        <p className="font-pixel" style={{ fontSize: spFont(8), letterSpacing: 2, textTransform: "uppercase", color: "#888890" }}>
                            HOLD <span style={{ fontSize: spFont(6), color: "#666670" }}>[C]</span>
                        </p>
                        {engine.holdUsedThisTurn && <span style={{ fontSize: spFont(8), color: "#cc3333", fontWeight: 700 }}>LOCK</span>}
                    </div>
                    {renderMiniPreview(engine.heldPieceType)}
                </div>

                <div style={{ ...bevel(), background: "#2a2a30", padding: spPad(5), display: "flex", flexDirection: "column", gap: spPad(2) }}>
                    {renderStatRow("SCORE", engine.score, true)}
                    {renderStatRow("LINES", engine.lines)}
                    {renderStatRow("LEVEL", engine.level)}
                    <div style={{ ...bevel(true), background: "#1a1a22", padding: `${spPad(2)}px ${spPad(8)}px`, textAlign: "center" }}>
                        <span style={{ color: "#666670", fontSize: spFont(9) }}>SPEED {engine.dropIntervalMs}ms</span>
                    </div>
                </div>

                {engine.combo >= 2 && (
                    <div style={{ ...bevel(), background: "#1a1a22", padding: `${spPad(4)}px ${spPad(8)}px`, textAlign: "center" }}>
                        <span style={{ color: "#44ccff", fontSize: spFont(14), fontWeight: 900, letterSpacing: 2, textShadow: "0 0 6px #2288aa", fontFamily: "monospace" }}>
                            COMBO x{engine.combo}
                        </span>
                    </div>
                )}

                {!isMobile && (
                    <div style={{ ...bevel(), background: "#2a2a30", padding: 0 }}>
                        <div style={{ background: "#1a1a22", ...bevel(true), padding: `${spPad(4)}px ${spPad(6)}px` }}>
                            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: `${spPad(1)}px ${spPad(6)}px`, alignItems: "center" }}>
                                {[["← →", "이동"], ["↑ ↓", "회전/내리기"], ["SPC", "드롭"], ["C/P", "홀드/정지"]].map(([k, v]) => (
                                    <React.Fragment key={k}>
                                        <span style={{ color: "#aabb88", fontSize: spFont(10), fontWeight: 900, fontFamily: "monospace", textAlign: "right", textShadow: "0 0 4px #446622", lineHeight: 1.3 }}>{k}</span>
                                        <span style={{ color: "#888890", fontSize: spFont(9), fontFamily: "monospace", lineHeight: 1.3, opacity: 0.6 }}>{v}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                            <button
                                onClick={() => useTypingStore.getState().toggleFx()}
                                style={{
                                    width: "100%", marginTop: spPad(4), height: spPad(18),
                                    fontSize: spFont(9), fontWeight: 700, letterSpacing: 2, fontFamily: "monospace",
                                    ...bevel(animEnabled),
                                    background: animEnabled ? "#1a2a1a" : "#2a2a30",
                                    color: animEnabled ? "#aabb88" : "#666670",
                                    cursor: "pointer",
                                    textShadow: animEnabled ? "0 0 4px #446622" : "none",
                                }}
                            >
                                FX {animEnabled ? "ON" : "OFF"}
                            </button>
                        </div>
                    </div>
                )}

                {isMobile && (
                    <div style={{ ...bevel(), background: "#2a2a30", padding: spPad(3) }}>
                        <button
                            onClick={() => useTypingStore.getState().toggleFx()}
                            style={{
                                width: "100%", height: spPad(20),
                                fontSize: spFont(9), fontWeight: 700, letterSpacing: 2, fontFamily: "monospace",
                                ...bevel(animEnabled),
                                background: animEnabled ? "#1a2a1a" : "#2a2a30",
                                color: animEnabled ? "#aabb88" : "#666670",
                                cursor: "pointer",
                                textShadow: animEnabled ? "0 0 4px #446622" : "none",
                            }}
                        >
                            FX {animEnabled ? "ON" : "OFF"}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // ─── 모바일 컨트롤 패드 ───
    const renderControlPad = () => {
        const btnH = 44;
        const dpadStyle = (disabled: boolean): React.CSSProperties => ({
            height: btnH, fontSize: 20, fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
            background: disabled ? "#1a1a20" : "#2a2a30",
            color: disabled ? "#444448" : "#ccccdd",
            borderStyle: "solid", borderWidth: "3px",
            borderTopColor: disabled ? "#222228" : "#666670",
            borderLeftColor: disabled ? "#222228" : "#666670",
            borderBottomColor: disabled ? "#111115" : "#1a1a20",
            borderRightColor: disabled ? "#111115" : "#1a1a20",
        });
        return (
            <div style={{ background: "#2a2a30", padding: 6, borderStyle: "solid", borderWidth: "3px", borderTopColor: "#666670", borderLeftColor: "#666670", borderBottomColor: "#1a1a20", borderRightColor: "#1a1a20" }}>
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
                            height: btnH, fontSize: 12, fontWeight: 900, letterSpacing: 1,
                            cursor: (controlsDisabled || engine.holdUsedThisTurn) ? "not-allowed" : "pointer",
                            background: (controlsDisabled || engine.holdUsedThisTurn) ? "#1a1a20" : "#334433",
                            color: (controlsDisabled || engine.holdUsedThisTurn) ? "#444448" : "#ccccdd",
                            borderStyle: "solid", borderWidth: "3px",
                            borderTopColor: (controlsDisabled || engine.holdUsedThisTurn) ? "#222228" : "#666670",
                            borderLeftColor: (controlsDisabled || engine.holdUsedThisTurn) ? "#222228" : "#666670",
                            borderBottomColor: "#1a1a20", borderRightColor: "#1a1a20",
                        }}
                    >
                        HOLD
                    </button>
                    <button
                        onClick={engine.hardDrop}
                        disabled={controlsDisabled}
                        style={{
                            height: btnH, fontSize: 13, fontWeight: 900, letterSpacing: 3,
                            cursor: controlsDisabled ? "not-allowed" : "pointer",
                            background: controlsDisabled ? "#1a1a20" : "#882222",
                            color: controlsDisabled ? "#444448" : "#ccccdd",
                            borderStyle: "solid", borderWidth: "3px",
                            borderTopColor: controlsDisabled ? "#222228" : "#aa4444",
                            borderLeftColor: controlsDisabled ? "#222228" : "#aa4444",
                            borderBottomColor: "#1a1a20", borderRightColor: "#1a1a20",
                        }}
                    >
                        DROP
                    </button>
                    <button
                        onClick={() => { if (engine.running && !engine.gameOver) engine.setPaused((v) => !v); }}
                        disabled={!engine.running || engine.gameOver}
                        style={{
                            height: btnH, fontSize: 14, fontWeight: 900,
                            cursor: (!engine.running || engine.gameOver) ? "not-allowed" : "pointer",
                            background: (!engine.running || engine.gameOver) ? "#1a1a20" : engine.paused ? "#886622" : "#2a2a30",
                            color: (!engine.running || engine.gameOver) ? "#444448" : "#ccccdd",
                            borderStyle: "solid", borderWidth: "3px",
                            borderTopColor: (!engine.running || engine.gameOver) ? "#222228" : "#666670",
                            borderLeftColor: (!engine.running || engine.gameOver) ? "#222228" : "#666670",
                            borderBottomColor: "#1a1a20", borderRightColor: "#1a1a20",
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
            style={{ color: "var(--retro-game-text)", fontFamily: "inherit" }}
        >
            <div className="mx-auto w-fit max-w-full min-h-0 flex-1">
                {isMobile ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "grid", gridTemplateColumns: `${boardPx + 14}px ${sidePanelWidth}px`, alignItems: "start", gap: 8 }}>
                            {renderBoard()}
                            {renderSidePanel()}
                        </div>
                        {renderControlPad()}
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: `${boardPx + 14}px ${sidePanelWidth}px`, alignItems: "start", gap: 12 }}>
                        {renderBoard()}
                        {renderSidePanel()}
                    </div>
                )}
            </div>
        </section>
    );
}
