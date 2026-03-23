"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useResponsiveTetrisSize } from "@/hooks/useResponsiveTetrisSize";
import { useTetrisAnimations } from "@/hooks/useTetrisAnimations";
import { useTetrisEngine, PIECES, CELL_COLORS, BOARD_WIDTH, BOARD_HEIGHT } from "@/hooks/useTetrisEngine";
import type { PieceType } from "@/hooks/useTetrisEngine";
import { GRAIN_SCALE, SAND_COLS, SAND_ROWS } from "@/lib/sandPhysics";
import { useMultiplayerTetris, deserializeBoard } from "@/hooks/useMultiplayerTetris";
import { useScoreSubmit } from "@/hooks/useScoreSubmit";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
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
    const { checkAchievements } = useAchievementChecker();
    const { user, profile } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";
    const { sectionRef, cellSize: rawCellSize, isMobile } = useResponsiveTetrisSize();
    const animEnabled = useTypingStore((s) => s.fxEnabled);
    const anim = useTetrisAnimations(animEnabled);
    const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevPhaseRef = useRef<string | null>(null);
    const scoreSubmittedRef = useRef(false);
    const liveMatchRef = useRef(false);
    const prevLevelRef = useRef(1);

    // 배틀 모드는 두 보드가 들어가므로 셀 크기를 줄임
    const cellSize = Math.max(10, Math.floor(rawCellSize * 0.82));
    const opponentCellSize = Math.max(4, Math.floor(cellSize * 0.42));

    const onLinesCleared = useCallback((rows: number[], _removed: number, totalGain: number, newCombo: number) => {
        anim.triggerFlash(rows);
        anim.triggerScorePop();
        anim.addFloatingText(`+${totalGain}`, "var(--retro-game-warning)");

        const lineCount = rows.length;
        if (lineCount === 2) anim.triggerClearLabel("DOUBLE");
        else if (lineCount === 3) anim.triggerClearLabel("TRIPLE");
        else if (lineCount >= 4) {
            anim.triggerClearLabel("TETRIS!");
            anim.triggerScreenFlash();
        }

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

    const engine = useTetrisEngine({ onLinesCleared, onHardDrop, onGameOver: () => {} }, isMobile);
    const mp = useMultiplayerTetris(room.getChannel, true, user?.id ?? "");
    const prevLinesRef = useRef(0);
    const prevOpponentRef = useRef<string | null>(null);

    // 초기: running=false 상태 유지 (START 버튼 오버레이 표시)

    // 공식 매치 시작 시 (countdown 진입) 리셋
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

    // 상대 입장 시 연습 중이면 게임 멈추고 리셋 → Ready 대기 상태
    useEffect(() => {
        const prev = prevOpponentRef.current;
        prevOpponentRef.current = room.opponentUserId;

        // 상대가 새로 입장한 경우 (null → userId)
        if (!prev && room.opponentUserId && room.phase === "waiting") {
            if (engine.running) {
                // 연습 중이었으면 리셋
                engine.resetGame();
                // resetGame은 running=true로 만드므로 바로 pause
                engine.setPaused(true);
            }
        }
    }, [room.opponentUserId, room.phase, engine]);

    // renderedBoard를 브로드캐스트 (활성 피스 포함)
    useEffect(() => {
        if (room.phase !== "playing") return;

        broadcastIntervalRef.current = setInterval(() => {
            mp.broadcastBoard(engine.renderedBoard, engine.score, engine.lines, engine.level, engine.gameOver);
        }, 300);

        return () => {
            if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
        };
    }, [engine.renderedBoard, engine.gameOver, engine.level, engine.lines, engine.score, mp, room.phase]);

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
        const scoreData = {
            game_mode: "tetris",
            score: engine.score,
            lines: engine.lines,
            is_multiplayer: true,
            is_win: room.error === "WIN",
        };
        void submitScore(scoreData).then(() => checkAchievements(scoreData));
    }, [engine.lines, engine.score, room.error, room.phase, submitScore, checkAchievements]);

    // 레벨업 글로우
    useEffect(() => {
        if (engine.level > prevLevelRef.current && engine.running) {
            anim.triggerLevelGlow();
        }
        prevLevelRef.current = engine.level;
    }, [engine.level, engine.running, anim]);

    const showCountdown = room.phase === "countdown";
    const showRoomPanel = room.phase === "waiting";
    const showResult = room.phase === "finished";
    const iWon = room.error === "WIN";
    const controlsDisabled = !engine.running || engine.paused || engine.gameOver || engine.clearing || engine.settling;
    const boardPx = cellSize * BOARD_WIDTH;

    const bevel = (inset = false) => ({
        borderStyle: "solid" as const,
        borderWidth: "2px",
        borderTopColor: inset ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-hi)",
        borderLeftColor: inset ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-hi)",
        borderBottomColor: inset ? "var(--retro-game-panel-border-hi)" : "var(--retro-game-panel-border-lo)",
        borderRightColor: inset ? "var(--retro-game-panel-border-hi)" : "var(--retro-game-panel-border-lo)",
    });

    const myCanvasRef = useRef<HTMLCanvasElement>(null);
    const boardH = cellSize * BOARD_HEIGHT;

    // ─── Canvas 드로잉 유틸 (싱글플레이어와 동일) ───
    function adjustColor(hex: string, factor: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.min(255, Math.round(r * factor))},${Math.min(255, Math.round(g * factor))},${Math.min(255, Math.round(b * factor))})`;
    }



    const renderMiniPreview = (pieceType: PieceType | null) => {
        const sz = Math.max(6, Math.floor(cellSize * 0.45));
        return (
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(4, ${sz}px)`,
                    gap: 0,
                    background: "var(--retro-game-bg)",
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
                            style={{ width: sz, height: sz, background: "var(--retro-game-bg-alt)" }}
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

    // ─── RAF 루프: Canvas 렌더링 ───
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
            const canvas = myCanvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (ctx && canvas) {
                const cs = cellSizeRef.current;
                const gp = cs / GRAIN_SCALE;
                const dpr = window.devicePixelRatio || 1;
                const w = BOARD_WIDTH * cs;
                const h = BOARD_HEIGHT * cs;
                if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
                    canvas.width = Math.round(w * dpr);
                    canvas.height = Math.round(h * dpr);
                    canvas.style.width = `${w}px`;
                    canvas.style.height = `${h}px`;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }
                const s = engine.gsRef.current;
                // 배경
                ctx.fillStyle = "#0a0a0a";
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = "#1a1a1a";
                ctx.lineWidth = 0.5;
                for (let x = 1; x < BOARD_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, h); ctx.stroke(); }
                for (let y = 1; y < BOARD_HEIGHT; y++) { ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(w, y * cs); ctx.stroke(); }
                // 모래
                const shrink = gp * 0.15;
                for (let sy = 0; sy < SAND_ROWS; sy++) {
                    const row = s.sandGrid[sy];
                    for (let sx = 0; sx < SAND_COLS; sx++) {
                        const g = row[sx];
                        if (g === null) continue;
                        const c = CELL_COLORS[g];
                        const hash = (sy * 31 + sx * 17 + sy * sx * 7) & 0xff;
                        const brightness = 0.75 + (hash % 40) / 100;
                        ctx.fillStyle = adjustColor(c.face, brightness);
                        ctx.fillRect(sx * gp + shrink, sy * gp + shrink, gp - shrink * 2, gp - shrink * 2);
                    }
                }
                // 플래시
                if (s.flashGrid) {
                    ctx.fillStyle = "rgba(255,255,255,0.85)";
                    for (let fy = 0; fy < SAND_ROWS; fy++) {
                        for (let fx = 0; fx < SAND_COLS; fx++) {
                            if (s.flashGrid[fy * SAND_COLS + fx]) {
                                ctx.fillRect(fx * gp, fy * gp, gp, gp);
                            }
                        }
                    }
                }
                // 고스트 + 활성 피스
                if (s.activePiece && s.running && !s.gameOver) {
                    if (!s.settling) {
                        const c = CELL_COLORS[s.activePiece.type];
                        ctx.strokeStyle = `${c.face}55`;
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 3]);
                        for (const [dx, dy] of PIECES[s.activePiece.type][s.activePiece.rotation]) {
                            ctx.strokeRect((s.activePiece.x + dx) * cs + 0.5, (s.ghostY + dy) * cs + 0.5, cs - 1, cs - 1);
                        }
                        ctx.setLineDash([]);
                    }
                    const c = CELL_COLORS[s.activePiece.type];
                    const bw = Math.max(1, Math.floor(cs * 0.08));
                    for (const [dx, dy] of PIECES[s.activePiece.type][s.activePiece.rotation]) {
                        const px = (s.activePiece.x + dx) * cs;
                        const py = (s.activePiece.y + dy) * cs;
                        if (py + cs < 0) continue;
                        ctx.fillStyle = c.face; ctx.fillRect(px, py, cs, cs);
                        ctx.fillStyle = c.hi; ctx.fillRect(px, py, cs, bw); ctx.fillRect(px, py, bw, cs);
                        ctx.fillStyle = c.lo; ctx.fillRect(px, py + cs - bw, cs, bw); ctx.fillRect(px + cs - bw, py, bw, cs);
                        ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(px + bw, py + bw, cs - bw * 2, cs - bw * 2);
                    }
                }
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [engine.gsRef]);

    const renderMyBoard = () => (
        <div
            style={{
                position: "relative",
                alignSelf: "start",
                width: "fit-content",
                animation: shakeAnim,
            }}
        >
            <div
                style={{
                    padding: 4,
                    background: "var(--retro-game-panel)",
                    borderStyle: "solid",
                    borderWidth: "3px",
                    borderTopColor: "var(--retro-game-panel-border-hi)",
                    borderLeftColor: "var(--retro-game-panel-border-hi)",
                    borderBottomColor: "var(--retro-game-panel-border-lo)",
                    borderRightColor: "var(--retro-game-panel-border-lo)",
                    animation: anim.levelGlow ? "tetris-level-glow 0.6s ease-out" : undefined,
                }}
            >
                <div style={{ padding: 1, background: "var(--retro-game-panel-border-lo)", ...bevel(true) }}>
                    <canvas
                        ref={myCanvasRef}
                        style={{
                            display: "block",
                            width: boardPx,
                            height: boardH,
                            imageRendering: "pixelated",
                        }}
                    />
                </div>

                {/* 가비지 대기 표시 */}
                {room.phase === "playing" && mp.pendingGarbage > 0 && (
                    <div style={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        width: 4,
                        height: mp.pendingGarbage * cellSize,
                        background: "var(--retro-game-danger)",
                        animation: "tetris-blink 0.5s step-end infinite",
                        zIndex: 6,
                    }} />
                )}
            </div>

            {/* 임팩트 라인 */}
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

            {/* 플로팅 텍스트 */}
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

            {/* 클리어 라벨 (DOUBLE / TRIPLE / TETRIS!) */}
            {anim.clearLabel && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "30%",
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

            {/* 스크린 플래시 (TETRIS) */}
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

            {/* START 오버레이 — 아직 게임을 시작하지 않은 상태 */}
            {!engine.running && !engine.gameOver && room.phase === "waiting" && !room.opponentUserId && (
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
                    <p style={{ color: "var(--retro-game-info)", fontSize: Math.max(18, cellSize * 0.9), fontWeight: 900, letterSpacing: 6, textShadow: "2px 2px 0 #000", marginBottom: 6 }}>
                        TETRIS
                    </p>
                    <p style={{ color: "var(--retro-game-text-dim)", fontSize: 11, marginBottom: 14, animation: "tetris-blink 1.2s step-end infinite" }}>
                        {ko ? "연습을 시작하세요" : "START PRACTICE"}
                    </p>
                    <button
                        onClick={engine.resetGame}
                        style={{ ...bevel(), background: "var(--retro-game-danger)", color: "var(--retro-game-text)", padding: "8px 28px", fontSize: 14, fontWeight: 900, letterSpacing: 3, cursor: "pointer" }}
                    >
                        START
                    </button>
                </div>
            )}

            {/* 상대 입장 → 연습 멈춤 오버레이 */}
            {engine.paused && engine.running && room.phase === "waiting" && room.opponentUserId && (
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
                    <p style={{ color: "var(--retro-game-warning)", fontSize: Math.max(14, cellSize * 0.7), fontWeight: 900, letterSpacing: 4, textShadow: "2px 2px 0 #000" }}>
                        {ko ? "상대 입장!" : "OPPONENT JOINED!"}
                    </p>
                    <p style={{ color: "var(--retro-game-text-dim)", fontSize: 11, marginTop: 8 }}>
                        {ko ? "Ready를 눌러 대전을 시작하세요" : "Press Ready to start the match"}
                    </p>
                </div>
            )}

            {/* 상대 입장했지만 아직 START 안 눌렀던 경우 */}
            {!engine.running && !engine.gameOver && room.phase === "waiting" && room.opponentUserId && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.82)",
                        zIndex: 10,
                    }}
                >
                    <p style={{ color: "var(--retro-game-warning)", fontSize: Math.max(14, cellSize * 0.7), fontWeight: 900, letterSpacing: 4, textShadow: "2px 2px 0 #000" }}>
                        {ko ? "상대 입장!" : "OPPONENT JOINED!"}
                    </p>
                    <p style={{ color: "var(--retro-game-text-dim)", fontSize: 11, marginTop: 8 }}>
                        {ko ? "Ready를 눌러 대전을 시작하세요" : "Press Ready to start the match"}
                    </p>
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
                background: "var(--retro-game-bg-alt)",
                padding: `${spPad(3)}px ${spPad(6)}px`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <span style={{ color: "var(--retro-game-text-dim)", fontSize: spFont(10), textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
            <span
                style={{
                    color: "var(--retro-game-warning)",
                    fontSize: spFont(14),
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                    animation: pop && anim.scorePop ? "tetris-score-pop 0.3s ease-out" : undefined,
                }}
            >
                {value.toLocaleString()}
            </span>
        </div>
    );

    const renderSidePanel = () => {
        const gap = Math.max(2, spPad(3));
        return (
            <div style={{ display: "flex", flexDirection: "column", gap }}>
                {/* 내 정보 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 2 }}>
                    <PixelAvatar config={profile?.avatar_config ?? null} nickname={profile?.nickname ?? "?"} size="sm" />
                    <span style={{ fontSize: spFont(10), fontWeight: 700, color: "var(--retro-game-info)" }}>
                        {ko ? "나" : "YOU"}
                    </span>
                </div>

                {/* NEXT */}
                <div style={{ ...bevel(), background: "var(--retro-game-panel)", padding: spPad(4) }}>
                    <p style={{ fontSize: spFont(9), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--retro-game-text-dim)", textAlign: "center", marginBottom: spPad(2) }}>
                        NEXT
                    </p>
                    {renderMiniPreview(engine.nextPieceType)}
                </div>

                {/* HOLD */}
                <div style={{ ...bevel(), background: "var(--retro-game-panel)", padding: spPad(4) }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spPad(2) }}>
                        <p style={{ fontSize: spFont(9), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--retro-game-text-dim)" }}>
                            HOLD <span style={{ fontSize: spFont(7), color: "var(--retro-game-text-dim)", fontWeight: 400 }}>[C]</span>
                        </p>
                        {engine.holdUsedThisTurn && (
                            <span style={{ fontSize: spFont(7), color: "var(--retro-game-danger)", fontWeight: 700 }}>LOCK</span>
                        )}
                    </div>
                    {renderMiniPreview(engine.heldPieceType)}
                </div>

                {/* 스탯 */}
                <div style={{ ...bevel(), background: "var(--retro-game-panel)", padding: spPad(4), display: "flex", flexDirection: "column", gap: spPad(2) }}>
                    {renderStatRow("SCORE", engine.score, true)}
                    {renderStatRow("LINES", engine.lines)}
                    {renderStatRow("LEVEL", engine.level)}
                </div>

                {/* 콤보 표시 */}
                {engine.combo >= 2 && (
                    <div style={{
                        ...bevel(),
                        background: "var(--retro-game-bg-alt)",
                        padding: `${spPad(3)}px ${spPad(6)}px`,
                        textAlign: "center",
                    }}>
                        <span style={{
                            color: "var(--retro-game-info)",
                            fontSize: spFont(12),
                            fontWeight: 900,
                            letterSpacing: 2,
                            textShadow: "0 0 6px var(--retro-game-glow)",
                            fontFamily: "monospace",
                        }}>
                            COMBO x{engine.combo}
                        </span>
                    </div>
                )}

                {/* FX 토글 */}
                <button
                    onClick={() => useTypingStore.getState().toggleFx()}
                    style={{
                        height: spPad(18),
                        fontSize: spFont(9),
                        fontWeight: 700,
                        letterSpacing: 2,
                        fontFamily: "monospace",
                        ...bevel(animEnabled),
                        background: animEnabled ? "var(--retro-game-key-bg)" : "var(--retro-game-panel)",
                        color: animEnabled ? "var(--retro-game-key-text)" : "var(--retro-game-text-dim)",
                        cursor: "pointer",
                        textShadow: animEnabled ? "0 0 4px var(--retro-game-glow)" : "none",
                    }}
                >
                    FX {animEnabled ? "ON" : "OFF"}
                </button>
            </div>
        );
    };

    const renderOpponentPanel = () => {
        const board = deserializeBoard(mp.opponent.board);
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {/* 상대 정보 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <PixelAvatar config={room.opponentAvatarConfig} nickname={room.opponentNickname ?? "?"} size="sm" />
                    <span style={{ fontSize: spFont(10), fontWeight: 700, color: "var(--retro-game-danger)" }}>
                        {ko ? "상대" : "OPP"}
                    </span>
                </div>

                {/* 상대 보드 */}
                <div style={{
                    ...bevel(),
                    background: "var(--retro-game-panel)",
                    padding: 3,
                }}>
                    <div style={{ ...bevel(true), padding: 1 }}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${opponentCellSize}px)`,
                                gap: 0,
                                background: "var(--retro-game-bg)",
                            }}
                        >
                            {board.flatMap((row, ri) =>
                                row.map((cell, ci) => {
                                    if (cell) {
                                        const c = CELL_COLORS[cell];
                                        return (
                                            <div
                                                key={`${ri}-${ci}`}
                                                style={{
                                                    width: opponentCellSize,
                                                    height: opponentCellSize,
                                                    background: c.face,
                                                    borderStyle: "solid",
                                                    borderWidth: "1px",
                                                    borderTopColor: c.hi,
                                                    borderLeftColor: c.hi,
                                                    borderBottomColor: c.lo,
                                                    borderRightColor: c.lo,
                                                }}
                                            />
                                        );
                                    }
                                    return (
                                        <div
                                            key={`${ri}-${ci}`}
                                            style={{
                                                width: opponentCellSize,
                                                height: opponentCellSize,
                                                background: "var(--retro-game-bg)",
                                            }}
                                        />
                                    );
                                }),
                            )}
                        </div>
                    </div>
                </div>

                {/* 상대 스탯 */}
                <div style={{ ...bevel(), background: "var(--retro-game-panel)", padding: spPad(4), display: "flex", flexDirection: "column", gap: spPad(2) }}>
                    <div style={{ ...bevel(true), background: "var(--retro-game-bg-alt)", padding: `${spPad(2)}px ${spPad(4)}px`, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--retro-game-text-dim)", fontSize: spFont(9) }}>SCORE</span>
                        <span style={{ color: "var(--retro-game-warning)", fontSize: spFont(11), fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                            {mp.opponent.score.toLocaleString()}
                        </span>
                    </div>
                    <div style={{ ...bevel(true), background: "var(--retro-game-bg-alt)", padding: `${spPad(2)}px ${spPad(4)}px`, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--retro-game-text-dim)", fontSize: spFont(9) }}>LV / L</span>
                        <span style={{ color: "var(--retro-game-text)", fontSize: spFont(11), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                            {mp.opponent.level} / {mp.opponent.lines}
                        </span>
                    </div>
                </div>

                {!room.opponentUserId && (
                    <div style={{ textAlign: "center", padding: spPad(4) }}>
                        <span style={{ fontSize: spFont(9), color: "var(--retro-game-text-dim)", animation: "tetris-blink 1.2s step-end infinite" }}>
                            {ko ? "상대 입장 전..." : "Waiting..."}
                        </span>
                    </div>
                )}

                {mp.opponent.gameOver && room.opponentUserId && (
                    <div style={{ textAlign: "center", padding: spPad(3) }}>
                        <span style={{ fontSize: spFont(10), color: "var(--retro-game-danger)", fontWeight: 900, letterSpacing: 2 }}>
                            K.O.
                        </span>
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
            background: disabled ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel)",
            color: disabled ? "var(--retro-game-text-dim)" : "var(--retro-game-text)",
            borderStyle: "solid",
            borderWidth: "3px",
            borderTopColor: disabled ? "var(--retro-game-panel)" : "var(--retro-game-panel-border-hi)",
            borderLeftColor: disabled ? "var(--retro-game-panel)" : "var(--retro-game-panel-border-hi)",
            borderBottomColor: disabled ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-lo)",
            borderRightColor: disabled ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-lo)",
        });
        return (
            <div style={{ background: "var(--retro-game-panel)", padding: 6, borderStyle: "solid", borderWidth: "3px", borderTopColor: "var(--retro-game-panel-border-hi)", borderLeftColor: "var(--retro-game-panel-border-hi)", borderBottomColor: "var(--retro-game-panel-border-lo)", borderRightColor: "var(--retro-game-panel-border-lo)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                    <div />
                    <button onClick={engine.rotatePiece} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)} aria-label="Rotate">↑</button>
                    <div />
                    <button onClick={() => engine.moveHorizontal(-1)} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)} aria-label="Move left">←</button>
                    <button onClick={engine.softDrop} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)} aria-label="Soft drop">↓</button>
                    <button onClick={() => engine.moveHorizontal(1)} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)} aria-label="Move right">→</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 5, marginTop: 5 }}>
                    <button
                        onClick={engine.holdPiece}
                        disabled={controlsDisabled || engine.holdUsedThisTurn}
                        aria-label="Hold piece"
                        style={{
                            height: btnH,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: 1,
                            cursor: (controlsDisabled || engine.holdUsedThisTurn) ? "not-allowed" : "pointer",
                            background: (controlsDisabled || engine.holdUsedThisTurn) ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-highlight)",
                            color: (controlsDisabled || engine.holdUsedThisTurn) ? "var(--retro-game-text-dim)" : "var(--retro-game-text)",
                            borderStyle: "solid",
                            borderWidth: "3px",
                            borderTopColor: (controlsDisabled || engine.holdUsedThisTurn) ? "var(--retro-game-panel)" : "var(--retro-game-panel-border-hi)",
                            borderLeftColor: (controlsDisabled || engine.holdUsedThisTurn) ? "var(--retro-game-panel)" : "var(--retro-game-panel-border-hi)",
                            borderBottomColor: (controlsDisabled || engine.holdUsedThisTurn) ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-lo)",
                            borderRightColor: (controlsDisabled || engine.holdUsedThisTurn) ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-lo)",
                        }}
                    >
                        HOLD
                    </button>
                    <button
                        onClick={engine.hardDrop}
                        disabled={controlsDisabled}
                        aria-label="Hard drop"
                        style={{
                            height: btnH,
                            fontSize: 13,
                            fontWeight: 900,
                            letterSpacing: 3,
                            cursor: controlsDisabled ? "not-allowed" : "pointer",
                            background: controlsDisabled ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-danger)",
                            color: controlsDisabled ? "var(--retro-game-text-dim)" : "var(--retro-game-text)",
                            borderStyle: "solid",
                            borderWidth: "3px",
                            borderTopColor: controlsDisabled ? "var(--retro-game-panel)" : "var(--retro-game-panel-border-hi)",
                            borderLeftColor: controlsDisabled ? "var(--retro-game-panel)" : "var(--retro-game-panel-border-hi)",
                            borderBottomColor: controlsDisabled ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-lo)",
                            borderRightColor: controlsDisabled ? "var(--retro-game-panel-border-lo)" : "var(--retro-game-panel-border-lo)",
                        }}
                    >
                        DROP
                    </button>
                    <button
                        onClick={() => useTypingStore.getState().toggleFx()}
                        aria-label={`FX ${animEnabled ? "ON" : "OFF"}`}
                        aria-pressed={animEnabled}
                        style={{
                            height: btnH,
                            fontSize: 12,
                            fontWeight: 900,
                            cursor: "pointer",
                            ...bevel(animEnabled),
                            background: animEnabled ? "var(--retro-game-key-bg)" : "var(--retro-game-panel)",
                            color: animEnabled ? "var(--retro-game-key-text)" : "var(--retro-game-text-dim)",
                            textShadow: animEnabled ? "0 0 4px var(--retro-game-glow)" : "none",
                        }}
                    >
                        FX
                    </button>
                </div>
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
                {isMobile ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "start" }}>
                            {renderMyBoard()}
                            {renderOpponentPanel()}
                        </div>
                        {renderControlPad()}
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                        {renderSidePanel()}
                        {renderMyBoard()}
                        {renderOpponentPanel()}
                    </div>
                )}
            </div>

            {showCountdown && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 40,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
                }}>
                    <div style={{ textAlign: "center" }} role="status" aria-live="assertive">
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
                <div
                    role="dialog"
                    aria-labelledby="tetris-result-title"
                    aria-modal="true"
                    style={{
                        position: "fixed", inset: 0, zIndex: 50,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
                    }}
                >
                    <div style={{ textAlign: "center" }}>
                        <p
                            id="tetris-result-title"
                            style={{
                                fontSize: 36, fontWeight: 900, letterSpacing: 6,
                                color: iWon ? "var(--retro-game-success)" : "var(--retro-game-danger)",
                                textShadow: "2px 2px 0 #000",
                            }}
                        >
                            {iWon ? (ko ? "승리!" : "WIN!") : (ko ? "패배" : "LOSE")}
                        </p>
                        <p style={{ color: "var(--retro-game-text)", fontSize: 14, marginTop: 8 }}>
                            {ko ? "점수" : "Score"}: {engine.score.toLocaleString()}
                        </p>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                            {room.opponentUserId && (
                                <button
                                    onClick={() => void room.requestRematch()}
                                    aria-label={ko ? "재도전" : "Rematch"}
                                    style={{
                                        padding: "8px 24px",
                                        background: "var(--retro-game-info)", color: "var(--retro-game-text)",
                                        fontWeight: 900, fontSize: 14, letterSpacing: 2, cursor: "pointer",
                                        borderStyle: "solid", borderWidth: "3px",
                                        borderTopColor: "var(--retro-game-panel-border-hi)",
                                        borderLeftColor: "var(--retro-game-panel-border-hi)",
                                        borderBottomColor: "var(--retro-game-panel-border-lo)",
                                        borderRightColor: "var(--retro-game-panel-border-lo)",
                                    }}
                                >
                                    {ko ? "재도전" : "REMATCH"}
                                </button>
                            )}
                            <button
                                onClick={onFinish}
                                aria-label={ko ? "로비로 돌아가기" : "Back to lobby"}
                                style={{
                                    padding: "8px 24px",
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
                </div>
            )}
        </section>
    );
}
