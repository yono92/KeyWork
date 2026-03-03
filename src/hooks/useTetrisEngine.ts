import { useState, useCallback, useEffect, useRef, useMemo } from "react";

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Cell = PieceType | null;

export interface ActivePiece {
    type: PieceType;
    rotation: number;
    x: number;
    y: number;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

const PIECE_TYPES: readonly PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
const INITIAL_ACTIVE_TYPE: PieceType = "T";
const INITIAL_NEXT_TYPE: PieceType = "I";

export const PIECES: Record<PieceType, readonly (readonly [number, number][])[]> = {
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

export const CELL_COLORS: Record<PieceType, { face: string; hi: string; lo: string }> = {
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

/** 라인 클리어 애니메이션 지속 시간 (ms) — flash 후 보드 갱신 */
const LINE_CLEAR_DELAY = 500;

export interface TetrisCallbacks {
    onLinesCleared: (rows: number[], removed: number, totalGain: number, combo: number) => void;
    onHardDrop: (distance: number, landingRow: number) => void;
    onGameOver: () => void;
}

/**
 * Tetris 핵심 게임 엔진 — 보드, 피스, 충돌, 점수, 콤보, gravity, 키보드 입력
 */
export function useTetrisEngine(callbacks: TetrisCallbacks, isMobile: boolean) {
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
    const [combo, setCombo] = useState(0);
    const [clearing, setClearing] = useState(false);

    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const level = Math.min(10, Math.floor(lines / 10) + 1);
    const dropIntervalMs = isMobile
        ? Math.max(100, 460 - (level - 1) * 50)
        : Math.max(140, 620 - (level - 1) * 45);

    const resetGame = useCallback(() => {
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
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
        setCombo(0);
        setClearing(false);
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
                callbacksRef.current.onGameOver();
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
            const newCombo = combo + 1;
            setCombo(newCombo);
            const lineScore = getLineScore(removed, level);
            const comboBonus = newCombo >= 1 ? 50 * newCombo * level : 0;
            const totalGain = lineScore + comboBonus;
            setLines((prev) => prev + removed);
            setScore((prev) => prev + totalGain);

            // Phase 1: 머지된 보드(꽉 찬 행 포함)를 보여주면서 플래시
            setBoard(merged);
            setClearing(true);
            // 활성 피스를 화면 밖으로 (렌더 오버레이 방지)
            setActivePiece((prev) => ({ ...prev, y: -10 }));
            callbacksRef.current.onLinesCleared(clearedRows, removed, totalGain, newCombo);

            // Phase 2: 애니메이션 후 실제 행 제거 + 다음 피스
            clearTimerRef.current = setTimeout(() => {
                setBoard(nextBoard);
                setClearing(false);
                spawnFromQueue(nextBoard);
            }, LINE_CLEAR_DELAY);
        } else {
            setCombo(0);
            setBoard(merged);
            spawnFromQueue(merged);
        }
    }, [activePiece, board, combo, level, spawnFromQueue]);

    const moveHorizontal = useCallback(
        (deltaX: number) => {
            if (!running || paused || gameOver || clearing) return;
            if (!canPlace(board, activePiece, deltaX, 0)) return;
            setActivePiece((prev) => ({ ...prev, x: prev.x + deltaX }));
        },
        [activePiece, board, clearing, gameOver, paused, running],
    );

    const rotatePiece = useCallback(() => {
        if (!running || paused || gameOver || clearing) return;
        const nextRotation = (activePiece.rotation + 1) % PIECES[activePiece.type].length;
        const kicks = [0, -1, 1, -2, 2];
        const kickX = kicks.find((offset) => canPlace(board, activePiece, offset, 0, nextRotation));
        if (kickX === undefined) return;

        setActivePiece((prev) => ({
            ...prev,
            x: prev.x + kickX,
            rotation: nextRotation,
        }));
    }, [activePiece, board, clearing, gameOver, paused, running]);

    const softDrop = useCallback(() => {
        if (!running || paused || gameOver || clearing) return;
        if (canPlace(board, activePiece, 0, 1)) {
            setActivePiece((prev) => ({ ...prev, y: prev.y + 1 }));
            return;
        }
        lockPiece();
    }, [activePiece, board, clearing, gameOver, lockPiece, paused, running]);

    const hardDrop = useCallback(() => {
        if (!running || paused || gameOver || clearing) return;
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

        const landingRow = Math.max(...PIECES[activePiece.type][activePiece.rotation].map(([, dy]) => droppedPiece.y + dy));
        callbacksRef.current.onHardDrop(distance, landingRow);

        if (removed > 0) {
            const newCombo = combo + 1;
            setCombo(newCombo);
            const lineScore = getLineScore(removed, level);
            const comboBonus = newCombo >= 1 ? 50 * newCombo * level : 0;
            const totalGain = lineScore + comboBonus;
            setLines((prev) => prev + removed);
            setScore((prev) => prev + totalGain);

            // Phase 1: 머지된 보드(꽉 찬 행)를 보여주면서 플래시
            setBoard(merged);
            setClearing(true);
            setActivePiece((prev) => ({ ...prev, y: -10 }));
            callbacksRef.current.onLinesCleared(clearedRows, removed, totalGain, newCombo);

            // Phase 2: 애니메이션 후 행 제거 + 스폰
            clearTimerRef.current = setTimeout(() => {
                setBoard(nextBoard);
                setClearing(false);
                spawnFromQueue(nextBoard);
            }, LINE_CLEAR_DELAY);
        } else {
            setCombo(0);
            setBoard(merged);
            spawnFromQueue(merged);
        }
    }, [activePiece, board, clearing, combo, gameOver, level, paused, running, spawnFromQueue]);

    const holdPiece = useCallback(() => {
        if (!running || paused || gameOver || clearing || holdUsedThisTurn) return;

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
    }, [activePiece, board, clearing, gameOver, heldPieceType, holdUsedThisTurn, paused, running, spawnFromQueue]);

    // Gravity timer — clearing 중엔 일시정지
    useEffect(() => {
        if (!running || paused || gameOver || clearing) return;
        const id = window.setInterval(() => {
            softDrop();
        }, dropIntervalMs);
        return () => window.clearInterval(id);
    }, [clearing, dropIntervalMs, gameOver, paused, running, softDrop]);

    // Keyboard input
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
        if (!running || gameOver || clearing) return new Set<string>();
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
    }, [activePiece, board, clearing, gameOver, running]);

    return {
        board,
        activePiece,
        nextPieceType,
        heldPieceType,
        holdUsedThisTurn,
        score,
        lines,
        level,
        combo,
        running,
        paused,
        gameOver,
        clearing,
        dropIntervalMs,
        renderedBoard,
        ghostCells,
        resetGame,
        moveHorizontal,
        rotatePiece,
        softDrop,
        hardDrop,
        holdPiece,
        setPaused,
    };
}
