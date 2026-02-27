"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type Cell = PieceType | null;

interface ActivePiece {
    type: PieceType;
    rotation: number;
    x: number;
    y: number;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const PIECE_TYPES: readonly PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
const INITIAL_ACTIVE_TYPE: PieceType = "T";
const INITIAL_NEXT_TYPE: PieceType = "I";

const PIECES: Record<PieceType, readonly (readonly [number, number][])[]> = {
    I: [
        [[0, 1], [1, 1], [2, 1], [3, 1]],
        [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]],
        [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
    O: [
        [[1, 0], [2, 0], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [2, 1]],
    ],
    T: [
        [[1, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [1, 2]],
        [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
    S: [
        [[1, 0], [2, 0], [0, 1], [1, 1]],
        [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[1, 1], [2, 1], [0, 2], [1, 2]],
        [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
    Z: [
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[2, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 2]],
        [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
    J: [
        [[0, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]],
        [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
    L: [
        [[2, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 1], [0, 2]],
        [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
};

// NES-style flat pixel colors with hard bevel highlight/shadow
const CELL_COLORS: Record<PieceType, { face: string; hi: string; lo: string }> = {
    I: { face: "#00e5ff", hi: "#88ffff", lo: "#008b99" },
    O: { face: "#ffe000", hi: "#fff176", lo: "#997a00" },
    T: { face: "#bb44ff", hi: "#dd99ff", lo: "#6a0099" },
    S: { face: "#44dd44", hi: "#99ff99", lo: "#1a7a1a" },
    Z: { face: "#ff3333", hi: "#ff8888", lo: "#990000" },
    J: { face: "#3366ff", hi: "#88aaff", lo: "#002299" },
    L: { face: "#ff8800", hi: "#ffbb66", lo: "#994400" },
};

const makeEmptyBoard = (): Cell[][] =>
    Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null));

const randomPieceType = (): PieceType =>
    PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];

const createActivePiece = (type: PieceType): ActivePiece => ({
    type,
    rotation: 0,
    x: 3,
    y: 0,
});

const canPlace = (
    board: Cell[][],
    piece: ActivePiece,
    moveX = 0,
    moveY = 0,
    rotation = piece.rotation,
): boolean => {
    const blocks = PIECES[piece.type][rotation];
    return blocks.every(([dx, dy]) => {
        const x = piece.x + dx + moveX;
        const y = piece.y + dy + moveY;
        if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return false;
        if (y >= 0 && board[y][x] !== null) return false;
        return true;
    });
};

const mergePiece = (board: Cell[][], piece: ActivePiece): Cell[][] => {
    const merged = board.map((row) => [...row]);
    for (const [dx, dy] of PIECES[piece.type][piece.rotation]) {
        const x = piece.x + dx;
        const y = piece.y + dy;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
            merged[y][x] = piece.type;
        }
    }
    return merged;
};

const clearFullLines = (board: Cell[][]): { nextBoard: Cell[][]; removed: number; clearedRows: number[] } => {
    const clearedRows: number[] = [];
    board.forEach((row, idx) => {
        if (row.every((cell) => cell !== null)) clearedRows.push(idx);
    });
    const remaining = board.filter((row) => row.some((cell) => cell === null));
    const removed = BOARD_HEIGHT - remaining.length;
    const filler = Array.from({ length: removed }, () => Array<Cell>(BOARD_WIDTH).fill(null));
    return { nextBoard: [...filler, ...remaining], removed, clearedRows };
};

const getLineScore = (removed: number, level: number): number => {
    if (removed <= 0) return 0;
    if (removed === 1) return 100 * level;
    if (removed === 2) return 300 * level;
    if (removed === 3) return 500 * level;
    return 800 * level;
};

const TETRIS_STYLES = `
@keyframes tetris-flash {
    0%, 100% { opacity: 0; }
    25% { opacity: 1; background: #fff; }
    50% { opacity: 1; background: #ffe000; }
    75% { opacity: 1; background: #fff; }
}
@keyframes tetris-shake {
    0%, 100% { transform: translateY(0); }
    25% { transform: translateY(2px); }
    50% { transform: translateY(-1px); }
    75% { transform: translateY(1px); }
}
@keyframes tetris-score-pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.35); }
    100% { transform: scale(1); }
}
@keyframes tetris-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
@keyframes tetris-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
}
`;

export default function TetrisGame() {
    const sectionRef = useRef<HTMLElement>(null);
    const [board, setBoard] = useState<Cell[][]>(() => makeEmptyBoard());
    const [activePiece, setActivePiece] = useState<ActivePiece>(() => createActivePiece(INITIAL_ACTIVE_TYPE));
    const [nextPieceType, setNextPieceType] = useState<PieceType>(INITIAL_NEXT_TYPE);
    const [heldPieceType, setHeldPieceType] = useState<PieceType | null>(null);
    const [holdUsedThisTurn, setHoldUsedThisTurn] = useState(false);
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [running, setRunning] = useState(false);
    const [paused, setPaused] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [cellSize, setCellSize] = useState(14);
    const [miniCellSize, setMiniCellSize] = useState(10);
    const [sidePanelWidth, setSidePanelWidth] = useState(96);

    const [flashRows, setFlashRows] = useState<number[]>([]);
    const [shaking, setShaking] = useState(false);
    const [scorePop, setScorePop] = useState(false);
    const [animEnabled, setAnimEnabled] = useState(true);

    const level = Math.min(10, Math.floor(lines / 10) + 1);
    const dropIntervalMs = isMobile
        ? Math.max(100, 460 - (level - 1) * 50)
        : Math.max(140, 620 - (level - 1) * 45);

    useEffect(() => {
        const id = "tetris-keyframes";
        if (document.getElementById(id)) return;
        const style = document.createElement("style");
        style.id = id;
        style.textContent = TETRIS_STYLES;
        document.head.appendChild(style);
    }, []);

    useEffect(() => {
        const update = () => {
            const el = sectionRef.current;
            const w = el?.clientWidth ?? window.innerWidth;
            // viewport에서 section top을 빼서 가용 높이 계산
            const top = el?.getBoundingClientRect().top ?? 0;
            const availH = Math.max(360, window.innerHeight - top - 4);
            const mobile = w < 760;
            setIsMobile(mobile);

            if (mobile) {
                // 모바일: 컨트롤패드 = 44*3행 + gap*3 + padding*2 + outer border = ~170
                const padH = 170;
                const maxByH = Math.floor((availH - padH - 12) / BOARD_HEIGHT);
                // 보드+사이드 너비: cell*10 + 8 + cell*4.5 + 14(frame) = w
                const maxByW = Math.floor((w - 22) / 14.5);
                const c = Math.max(10, Math.min(maxByH, maxByW));
                const side = Math.max(70, Math.floor(c * 4.5));
                setCellSize(c);
                setMiniCellSize(Math.max(6, Math.floor(c * 0.5)));
                setSidePanelWidth(side);
                return;
            }

            // 데스크탑: 보드가 가용 높이 꽉 채움
            // 보드 프레임 padding+border ~20px 감안
            const maxByH = Math.floor((availH - 14) / BOARD_HEIGHT);
            // 너비: cell*10 + 14(frame) + 12(gap) + cell*5(side) = cell*15 + 26
            const maxByW = Math.floor((w - 26) / 15);
            const c = Math.max(14, Math.min(48, maxByH, maxByW));
            const side = Math.max(120, Math.floor(c * 5));
            setCellSize(c);
            setMiniCellSize(Math.max(10, Math.floor(c * 0.6)));
            setSidePanelWidth(side);
        };

        update();
        const ro = typeof ResizeObserver !== "undefined" && sectionRef.current
            ? new ResizeObserver(() => update())
            : null;
        if (ro && sectionRef.current) ro.observe(sectionRef.current);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("resize", update);
            ro?.disconnect();
        };
    }, []);

    const triggerFlash = useCallback((rows: number[]) => {
        if (!animEnabled || rows.length === 0) return;
        setFlashRows(rows);
        setTimeout(() => setFlashRows([]), 350);
    }, [animEnabled]);

    const triggerShake = useCallback(() => {
        if (!animEnabled) return;
        setShaking(true);
        setTimeout(() => setShaking(false), 180);
    }, [animEnabled]);

    const triggerScorePop = useCallback(() => {
        if (!animEnabled) return;
        setScorePop(true);
        setTimeout(() => setScorePop(false), 300);
    }, [animEnabled]);

    const resetGame = useCallback(() => {
        const firstType = randomPieceType();
        setBoard(makeEmptyBoard());
        setActivePiece(createActivePiece(firstType));
        setNextPieceType(randomPieceType());
        setHeldPieceType(null);
        setHoldUsedThisTurn(false);
        setScore(0);
        setLines(0);
        setGameOver(false);
        setPaused(false);
        setRunning(true);
        setFlashRows([]);
    }, []);

    const spawnFromQueue = useCallback(
        (baseBoard: Cell[][]) => {
            const spawned = createActivePiece(nextPieceType);
            const queued = randomPieceType();
            setNextPieceType(queued);
            if (!canPlace(baseBoard, spawned)) {
                setGameOver(true);
                setRunning(false);
                setPaused(false);
                return;
            }
            setActivePiece(spawned);
            setHoldUsedThisTurn(false);
        },
        [nextPieceType],
    );

    const lockPiece = useCallback(() => {
        const merged = mergePiece(board, activePiece);
        const { nextBoard, removed, clearedRows } = clearFullLines(merged);

        if (removed > 0) {
            triggerFlash(clearedRows);
            triggerScorePop();
        }

        setBoard(nextBoard);
        if (removed > 0) {
            setLines((prev) => prev + removed);
            setScore((prev) => prev + getLineScore(removed, level));
        }
        spawnFromQueue(nextBoard);
    }, [activePiece, board, level, spawnFromQueue, triggerFlash, triggerScorePop]);

    const moveHorizontal = useCallback(
        (deltaX: number) => {
            if (!running || paused || gameOver) return;
            if (!canPlace(board, activePiece, deltaX, 0)) return;
            setActivePiece((prev) => ({ ...prev, x: prev.x + deltaX }));
        },
        [activePiece, board, gameOver, paused, running],
    );

    const rotatePiece = useCallback(() => {
        if (!running || paused || gameOver) return;
        const nextRotation = (activePiece.rotation + 1) % PIECES[activePiece.type].length;
        const kicks = [0, -1, 1, -2, 2];
        const kickX = kicks.find((offset) => canPlace(board, activePiece, offset, 0, nextRotation));
        if (kickX === undefined) return;

        setActivePiece((prev) => ({
            ...prev,
            x: prev.x + kickX,
            rotation: nextRotation,
        }));
    }, [activePiece, board, gameOver, paused, running]);

    const softDrop = useCallback(() => {
        if (!running || paused || gameOver) return;
        if (canPlace(board, activePiece, 0, 1)) {
            setActivePiece((prev) => ({ ...prev, y: prev.y + 1 }));
            return;
        }
        lockPiece();
    }, [activePiece, board, gameOver, lockPiece, paused, running]);

    const hardDrop = useCallback(() => {
        if (!running || paused || gameOver) return;
        let distance = 0;
        while (canPlace(board, activePiece, 0, distance + 1)) {
            distance += 1;
        }
        if (distance > 0) {
            setActivePiece((prev) => ({ ...prev, y: prev.y + distance }));
        }
        const droppedPiece = { ...activePiece, y: activePiece.y + distance };
        const merged = mergePiece(board, droppedPiece);
        const { nextBoard, removed, clearedRows } = clearFullLines(merged);

        triggerShake();
        if (removed > 0) {
            triggerFlash(clearedRows);
            triggerScorePop();
        }

        setBoard(nextBoard);
        if (removed > 0) {
            setLines((prev) => prev + removed);
            setScore((prev) => prev + getLineScore(removed, level));
        }
        spawnFromQueue(nextBoard);
    }, [activePiece, board, gameOver, level, paused, running, spawnFromQueue, triggerFlash, triggerShake, triggerScorePop]);

    const holdPiece = useCallback(() => {
        if (!running || paused || gameOver || holdUsedThisTurn) return;

        if (heldPieceType === null) {
            setHeldPieceType(activePiece.type);
            setHoldUsedThisTurn(true);
            spawnFromQueue(board);
            return;
        }

        const swappedPiece = createActivePiece(heldPieceType);
        if (!canPlace(board, swappedPiece)) return;

        setHeldPieceType(activePiece.type);
        setActivePiece(swappedPiece);
        setHoldUsedThisTurn(true);
    }, [activePiece, board, gameOver, heldPieceType, holdUsedThisTurn, paused, running, spawnFromQueue]);

    useEffect(() => {
        if (!running || paused || gameOver) return;
        const id = window.setInterval(() => {
            softDrop();
        }, dropIntervalMs);
        return () => window.clearInterval(id);
    }, [dropIntervalMs, gameOver, paused, running, softDrop]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!running || gameOver) return;
            if (event.key === "p" || event.key === "P") {
                setPaused((prev) => !prev);
                return;
            }
            if (paused) return;

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveHorizontal(-1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                moveHorizontal(1);
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                softDrop();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                rotatePiece();
            } else if (event.key === " ") {
                event.preventDefault();
                hardDrop();
            } else if (event.key === "c" || event.key === "C") {
                event.preventDefault();
                holdPiece();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [gameOver, hardDrop, holdPiece, moveHorizontal, paused, rotatePiece, running, softDrop]);

    const renderedBoard = useMemo(() => {
        const preview = board.map((row) => [...row]);
        for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
            const x = activePiece.x + dx;
            const y = activePiece.y + dy;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
                preview[y][x] = activePiece.type;
            }
        }
        return preview;
    }, [activePiece, board]);

    const ghostCells = useMemo(() => {
        if (!running || gameOver) return new Set<string>();
        let distance = 0;
        while (canPlace(board, activePiece, 0, distance + 1)) {
            distance += 1;
        }
        const ghostY = activePiece.y + distance;
        const cells = new Set<string>();
        for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
            const x = activePiece.x + dx;
            const y = ghostY + dy;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH && board[y][x] === null) {
                cells.add(`${y}-${x}`);
            }
        }
        return cells;
    }, [activePiece, board, gameOver, running]);

    const ghostType = activePiece.type;
    const controlsDisabled = !running || paused || gameOver;
    const boardPx = cellSize * BOARD_WIDTH;

    // 2px hard bevel border — NES/Win95 style
    const bevel = (inset = false) => ({
        borderStyle: "solid" as const,
        borderWidth: "2px",
        borderTopColor: inset ? "#222" : "#fff",
        borderLeftColor: inset ? "#222" : "#fff",
        borderBottomColor: inset ? "#fff" : "#222",
        borderRightColor: inset ? "#fff" : "#222",
    });

    // Pixel block cell style
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

    const renderBoard = () => (
        <div
            style={{
                position: "relative",
                alignSelf: "start",
                width: "fit-content",
                margin: "0 auto",
                animation: shaking ? "tetris-shake 0.18s ease-out" : undefined,
            }}
        >
            {/* 외곽 프레임 — 두꺼운 bevel */}
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
                }}
            >
                {/* 안쪽 inset */}
                <div
                    style={{
                        padding: 1,
                        background: "#000",
                        ...bevel(true),
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${cellSize}px)`,
                            gap: 0,
                            width: boardPx,
                            background: "#0a0a0a",
                        }}
                    >
                        {renderedBoard.flatMap((row, ri) =>
                            row.map((cell, ci) => {
                                const key = `${ri}-${ci}`;
                                const isFlash = flashRows.includes(ri);

                                if (isFlash && cell) {
                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                width: cellSize, height: cellSize,
                                                animation: "tetris-flash 0.35s linear forwards",
                                            }}
                                            aria-hidden="true"
                                        />
                                    );
                                }

                                if (cell) {
                                    return <div key={key} style={blockStyle(cell)} aria-hidden="true" />;
                                }

                                if (ghostCells.has(key)) {
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

            {/* 일시정지 오버레이 */}
            {paused && running && !gameOver && (
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
                    <p
                        style={{
                            color: "#ffe000",
                            fontSize: 22,
                            fontWeight: 900,
                            letterSpacing: 6,
                            textTransform: "uppercase",
                            animation: "tetris-blink 1s step-end infinite",
                            textShadow: "2px 2px 0 #000",
                        }}
                    >
                        PAUSE
                    </p>
                    <p style={{ color: "#aaa", fontSize: 11, marginTop: 6 }}>P 키로 재개</p>
                    <button
                        onClick={() => setPaused(false)}
                        style={{ ...bevel(), background: "#444", color: "#fff", padding: "6px 20px", cursor: "pointer", marginTop: 12, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
                    >
                        CONTINUE
                    </button>
                </div>
            )}

            {/* 게임 오버 오버레이 */}
            {gameOver && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.85)",
                        animation: "tetris-fade-in 0.3s ease-out",
                        zIndex: 10,
                    }}
                >
                    <p
                        style={{
                            color: "#ff3333",
                            fontSize: 22,
                            fontWeight: 900,
                            letterSpacing: 4,
                            textShadow: "2px 2px 0 #000",
                        }}
                    >
                        GAME OVER
                    </p>
                    <p style={{ color: "#ccc", fontSize: 13, marginTop: 4 }}>
                        SCORE: {score.toLocaleString()}
                    </p>
                    <button
                        onClick={resetGame}
                        style={{ ...bevel(), background: "#444", color: "#fff", padding: "6px 20px", cursor: "pointer", marginTop: 12, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
                    >
                        RETRY
                    </button>
                </div>
            )}

            {/* 시작 화면 오버레이 */}
            {!running && !gameOver && (
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
                    <p
                        style={{
                            color: "#00e5ff",
                            fontSize: 26,
                            fontWeight: 900,
                            letterSpacing: 6,
                            textShadow: "2px 2px 0 #000",
                            marginBottom: 6,
                        }}
                    >
                        TETRIS
                    </p>
                    <p style={{ color: "#777", fontSize: 11, marginBottom: 14, animation: "tetris-blink 1.2s step-end infinite" }}>
                        PRESS START
                    </p>
                    <button
                        onClick={resetGame}
                        style={{
                            ...bevel(),
                            background: "#cc3300",
                            color: "#fff",
                            padding: "8px 28px",
                            fontSize: 14,
                            fontWeight: 900,
                            letterSpacing: 3,
                            cursor: "pointer",
                        }}
                    >
                        START
                    </button>
                </div>
            )}
        </div>
    );

    // 사이드 패널 스케일 팩터
    const sp = Math.max(0.6, cellSize / 22); // 22px 기준 1.0
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
                    animation: pop && scorePop ? "tetris-score-pop 0.3s ease-out" : undefined,
                }}
            >
                {value.toLocaleString()}
            </span>
        </div>
    );

    const boardTotalH = cellSize * BOARD_HEIGHT + 20; // board + frame padding

    const renderSidePanel = () => {
        // 사이드 패널 내용이 보드 높이 안에 들어가도록 gap 조정
        const gap = Math.max(2, spPad(4));
        return (
            <div style={{ display: "flex", flexDirection: "column", gap, maxHeight: boardTotalH, overflow: "hidden" }}>
                {/* NEXT */}
                <div style={{ ...bevel(), background: "#333", padding: spPad(5) }}>
                    <p style={{ fontSize: spFont(10), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", textAlign: "center", marginBottom: spPad(3) }}>
                        NEXT
                    </p>
                    {renderMiniPreview(nextPieceType)}
                </div>

                {/* HOLD */}
                <div style={{ ...bevel(), background: "#333", padding: spPad(5) }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spPad(3) }}>
                        <p style={{ fontSize: spFont(10), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#aaa" }}>
                            HOLD <span style={{ fontSize: spFont(8), color: "#666", fontWeight: 400 }}>[C]</span>
                        </p>
                        {holdUsedThisTurn && (
                            <span style={{ fontSize: spFont(8), color: "#ff3333", fontWeight: 700 }}>LOCK</span>
                        )}
                    </div>
                    {renderMiniPreview(heldPieceType)}
                </div>

                {/* STATS */}
                <div style={{ ...bevel(), background: "#333", padding: spPad(5), display: "flex", flexDirection: "column", gap: spPad(2) }}>
                    {renderStatRow("SCORE", score, true)}
                    {renderStatRow("LINES", lines)}
                    {renderStatRow("LEVEL", level)}
                    <div style={{ ...bevel(true), background: "#111", padding: `${spPad(2)}px ${spPad(8)}px`, textAlign: "center" }}>
                        <span style={{ color: "#555", fontSize: spFont(9) }}>SPEED {dropIntervalMs}ms</span>
                    </div>
                </div>

                {/* 데스크탑 조작법 + FX 토글 — 하나의 LCD 패널 */}
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
                                        <span style={{
                                            color: "#33ff33",
                                            fontSize: spFont(10),
                                            fontWeight: 900,
                                            fontFamily: "monospace",
                                            textAlign: "right",
                                            textShadow: "0 0 4px #33ff3388",
                                            lineHeight: 1.3,
                                        }}>
                                            {k}
                                        </span>
                                        <span style={{
                                            color: "#33ff3399",
                                            fontSize: spFont(9),
                                            fontFamily: "monospace",
                                            lineHeight: 1.3,
                                        }}>
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

                {/* 모바일 FX 토글 */}
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
                    <button onClick={rotatePiece} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>↑</button>
                    <div />
                    <button onClick={() => moveHorizontal(-1)} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>←</button>
                    <button onClick={softDrop} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>↓</button>
                    <button onClick={() => moveHorizontal(1)} disabled={controlsDisabled} style={dpadStyle(controlsDisabled)}>→</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 5, marginTop: 5 }}>
                    <button
                        onClick={holdPiece}
                        disabled={controlsDisabled || holdUsedThisTurn}
                        style={{
                            height: btnH,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: 1,
                            cursor: (controlsDisabled || holdUsedThisTurn) ? "not-allowed" : "pointer",
                            background: (controlsDisabled || holdUsedThisTurn) ? "#3a3a3a" : "#3355aa",
                            color: (controlsDisabled || holdUsedThisTurn) ? "#555" : "#fff",
                            borderStyle: "solid",
                            borderWidth: "3px",
                            borderTopColor: (controlsDisabled || holdUsedThisTurn) ? "#444" : "#5588dd",
                            borderLeftColor: (controlsDisabled || holdUsedThisTurn) ? "#444" : "#5588dd",
                            borderBottomColor: (controlsDisabled || holdUsedThisTurn) ? "#222" : "#223377",
                            borderRightColor: (controlsDisabled || holdUsedThisTurn) ? "#222" : "#223377",
                        }}
                    >
                        HOLD
                    </button>
                    <button
                        onClick={hardDrop}
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
                        onClick={() => { if (running && !gameOver) setPaused((v) => !v); }}
                        disabled={!running || gameOver}
                        style={{
                            height: btnH,
                            fontSize: 14,
                            fontWeight: 900,
                            cursor: (!running || gameOver) ? "not-allowed" : "pointer",
                            background: (!running || gameOver) ? "#3a3a3a" : paused ? "#997700" : "#666",
                            color: (!running || gameOver) ? "#555" : paused ? "#fff" : "#fff",
                            borderStyle: "solid",
                            borderWidth: "3px",
                            borderTopColor: (!running || gameOver) ? "#444" : paused ? "#ccaa22" : "#999",
                            borderLeftColor: (!running || gameOver) ? "#444" : paused ? "#ccaa22" : "#999",
                            borderBottomColor: (!running || gameOver) ? "#222" : paused ? "#554400" : "#333",
                            borderRightColor: (!running || gameOver) ? "#222" : paused ? "#554400" : "#333",
                        }}
                    >
                        {paused ? "▶" : "⏸"}
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
            {/* 메인 영역 */}
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
