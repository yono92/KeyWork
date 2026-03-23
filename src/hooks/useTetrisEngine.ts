import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
    type PieceType,
    type SandGrid,
    GRAIN_SCALE,
    SAND_COLS,
    createSandGrid,
    isCellBlocked,
    stampCell,
    simulateStep,
    findFullRows,
    removeRows,
    sandGridToCellBoard,
} from "../lib/sandPhysics";

export type { PieceType };
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
    I: { face: "#d4b896", hi: "#e8d0b0", lo: "#a08060" },  // 밝은 모래
    O: { face: "#c9a94e", hi: "#e0c468", lo: "#8a7430" },  // 황금 모래
    T: { face: "#a07850", hi: "#c09870", lo: "#705030" },  // 갈색 흙
    S: { face: "#8a7a5a", hi: "#a89878", lo: "#5a5035" },  // 젖은 모래
    Z: { face: "#b06840", hi: "#d08860", lo: "#784020" },  // 붉은 흙
    J: { face: "#6b5a3a", hi: "#8a7858", lo: "#403018" },  // 진한 흙
    L: { face: "#c08040", hi: "#daa060", lo: "#885520" },  // 주황 흙
};

// re-export for sandPhysics consumers
export { GRAIN_SCALE, SAND_COLS, SAND_ROWS } from "../lib/sandPhysics";

const randomPieceType = (): PieceType =>
    PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];

const createActivePiece = (type: PieceType): ActivePiece => ({
    type,
    rotation: 0,
    x: 3,
    y: 0,
});

/** 피스가 모래 그리드 위에 놓일 수 있는지 확인 */
const canPlaceSand = (
    grid: SandGrid,
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
        if (y < 0) return true;
        return !isCellBlocked(grid, x, y);
    });
};

const getLineScore = (removed: number, level: number): number => {
    if (removed <= 0) return 0;
    if (removed === 1) return 100 * level;
    if (removed === 2) return 300 * level;
    if (removed === 3) return 500 * level;
    return 800 * level;
};

// ─── 게임 상태 (Ref) ───

interface GameState {
    sandGrid: SandGrid;
    activePiece: ActivePiece | null;
    ghostY: number;
    nextType: PieceType;
    heldType: PieceType | null;
    holdUsed: boolean;
    score: number;
    lines: number;
    combo: number;
    running: boolean;
    paused: boolean;
    gameOver: boolean;
    settling: boolean;
    gravityAcc: number;
    stepToggle: boolean;
    // 라인 클리어 플래시
    flashRows: number[];
    flashTimer: number;
    phaseClears: number;
    totalSandRows: number;
}

const FLASH_FRAMES = 12;
const STEPS_PER_FRAME = 8;

export interface TetrisCallbacks {
    onLinesCleared: (rows: number[], removed: number, totalGain: number, combo: number) => void;
    onHardDrop: (distance: number, landingRow: number) => void;
    onGameOver: () => void;
}

export function useTetrisEngine(callbacks: TetrisCallbacks, isMobile: boolean) {
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    // ─── Ref 기반 게임 상태 ───
    const gs = useRef<GameState>({
        sandGrid: createSandGrid(),
        activePiece: null,
        ghostY: 0,
        nextType: randomPieceType(),
        heldType: null,
        holdUsed: false,
        score: 0,
        lines: 0,
        combo: 0,
        running: false,
        paused: false,
        gameOver: false,
        settling: false,
        gravityAcc: 0,
        stepToggle: false,
        flashRows: [],
        flashTimer: 0,
        phaseClears: 0,
        totalSandRows: 0,
    });

    // ─── UI용 React state ───
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [combo, setCombo] = useState(0);
    const [running, setRunning] = useState(false);
    const [paused, setPausedState] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [nextPieceType, setNextPieceType] = useState<PieceType>(gs.current.nextType);
    const [heldPieceType, setHeldPieceType] = useState<PieceType | null>(null);
    const [holdUsedThisTurn, setHoldUsedThisTurn] = useState(false);
    const [boardVersion, setBoardVersion] = useState(0);

    const level = Math.min(10, Math.floor(lines / 10) + 1);
    const dropIntervalMs = isMobile
        ? Math.max(100, 460 - (level - 1) * 50)
        : Math.max(140, 620 - (level - 1) * 45);
    const dropIntervalRef = useRef(dropIntervalMs);
    const levelRef = useRef(level);
    useEffect(() => { dropIntervalRef.current = dropIntervalMs; }, [dropIntervalMs]);
    useEffect(() => { levelRef.current = level; }, [level]);

    const syncUI = useCallback(() => {
        const s = gs.current;
        setScore(s.score);
        setLines(s.lines);
        setCombo(s.combo);
        setRunning(s.running);
        setPausedState(s.paused);
        setGameOver(s.gameOver);
        setNextPieceType(s.nextType);
        setHeldPieceType(s.heldType);
        setHoldUsedThisTurn(s.holdUsed);
        setBoardVersion((v) => v + 1);
    }, []);

    const computeGhost = useCallback(() => {
        const s = gs.current;
        if (!s.activePiece) { s.ghostY = 0; return; }
        let gy = 0;
        while (canPlaceSand(s.sandGrid, s.activePiece, 0, gy + 1)) gy++;
        s.ghostY = s.activePiece.y + gy;
    }, []);

    const spawnPiece = useCallback(() => {
        const s = gs.current;
        const newPiece = createActivePiece(s.nextType);
        if (!canPlaceSand(s.sandGrid, newPiece)) {
            s.gameOver = true;
            s.running = false;
            s.paused = false;
            s.activePiece = null;
            callbacksRef.current.onGameOver();
            syncUI();
            return;
        }
        s.activePiece = newPiece;
        s.nextType = randomPieceType();
        s.holdUsed = false;
        s.gravityAcc = 0;
        computeGhost();
        syncUI();
    }, [computeGhost, syncUI]);

    const finishSettling = useCallback(() => {
        const s = gs.current;
        s.settling = false;
        const clearedSandRows = s.phaseClears;
        s.totalSandRows += clearedSandRows;
        const newTetrisLines = Math.floor(s.totalSandRows / GRAIN_SCALE);
        const linesThisPhase = newTetrisLines - s.lines;

        if (linesThisPhase > 0) {
            s.combo += 1;
            s.lines = newTetrisLines;
            const lineScore = getLineScore(linesThisPhase, levelRef.current);
            const comboBonus = s.combo >= 1 ? 50 * s.combo * levelRef.current : 0;
            const totalGain = lineScore + comboBonus;
            s.score += totalGain;
            callbacksRef.current.onLinesCleared([], linesThisPhase, totalGain, s.combo);
        } else {
            s.combo = 0;
        }

        s.phaseClears = 0;
        spawnPiece();
    }, [spawnPiece]);

    const lockPiece = useCallback(() => {
        const s = gs.current;
        if (!s.activePiece) return;
        const piece = s.activePiece;
        for (const [dx, dy] of PIECES[piece.type][piece.rotation]) {
            stampCell(s.sandGrid, piece.x + dx, piece.y + dy, piece.type);
        }
        s.activePiece = null;
        s.settling = true;
        s.phaseClears = 0;
        s.gravityAcc = 0;
    }, []);

    // ─── tick ───
    const tick = useCallback((dt: number) => {
        const s = gs.current;
        if (!s.running || s.paused || s.gameOver) return;

        // 플래시 처리
        if (s.flashRows.length > 0) {
            s.flashTimer--;
            if (s.flashTimer <= 0) {
                removeRows(s.sandGrid, s.flashRows);
                s.phaseClears += s.flashRows.length;
                s.flashRows = [];
            }
            return;
        }

        // 모래 물리
        let anyMoved = false;
        for (let i = 0; i < STEPS_PER_FRAME; i++) {
            if (simulateStep(s.sandGrid, s.stepToggle)) anyMoved = true;
            s.stepToggle = !s.stepToggle;
        }

        // 가득 찬 행 → 플래시
        const fullRows = findFullRows(s.sandGrid);
        if (fullRows.length > 0) {
            s.flashRows = fullRows;
            s.flashTimer = FLASH_FRAMES;
            return;
        }

        // 정착 완료
        if (s.settling && !anyMoved) {
            finishSettling();
            return;
        }

        // 중력
        if (!s.settling && s.activePiece) {
            s.gravityAcc += dt;
            while (s.gravityAcc >= dropIntervalRef.current) {
                s.gravityAcc -= dropIntervalRef.current;
                if (canPlaceSand(s.sandGrid, s.activePiece, 0, 1)) {
                    s.activePiece = { ...s.activePiece, y: s.activePiece.y + 1 };
                } else {
                    lockPiece();
                    return;
                }
            }
            computeGhost();
        }
    }, [computeGhost, finishSettling, lockPiece]);

    // ─── 액션 ───
    const moveHorizontal = useCallback((deltaX: number) => {
        const s = gs.current;
        if (!s.running || s.paused || s.gameOver || s.settling || !s.activePiece) return;
        if (!canPlaceSand(s.sandGrid, s.activePiece, deltaX, 0)) return;
        s.activePiece = { ...s.activePiece, x: s.activePiece.x + deltaX };
        computeGhost();
    }, [computeGhost]);

    const rotatePiece = useCallback(() => {
        const s = gs.current;
        if (!s.running || s.paused || s.gameOver || s.settling || !s.activePiece) return;
        const nextRot = (s.activePiece.rotation + 1) % PIECES[s.activePiece.type].length;
        const kicks = [0, -1, 1, -2, 2];
        const kickX = kicks.find((offset) => canPlaceSand(s.sandGrid, s.activePiece!, offset, 0, nextRot));
        if (kickX === undefined) return;
        s.activePiece = { ...s.activePiece, x: s.activePiece.x + kickX, rotation: nextRot };
        computeGhost();
    }, [computeGhost]);

    const softDrop = useCallback(() => {
        const s = gs.current;
        if (!s.running || s.paused || s.gameOver || s.settling || !s.activePiece) return;
        if (canPlaceSand(s.sandGrid, s.activePiece, 0, 1)) {
            s.activePiece = { ...s.activePiece, y: s.activePiece.y + 1 };
            computeGhost();
            return;
        }
        lockPiece();
    }, [computeGhost, lockPiece]);

    const hardDrop = useCallback(() => {
        const s = gs.current;
        if (!s.running || s.paused || s.gameOver || s.settling || !s.activePiece) return;
        let distance = 0;
        while (canPlaceSand(s.sandGrid, s.activePiece, 0, distance + 1)) distance++;
        const landingRow = Math.max(
            ...PIECES[s.activePiece.type][s.activePiece.rotation].map(([, dy]) => s.activePiece!.y + distance + dy),
        );
        s.activePiece = { ...s.activePiece, y: s.activePiece.y + distance };
        callbacksRef.current.onHardDrop(distance, landingRow);
        lockPiece();
    }, [lockPiece]);

    const holdPiece = useCallback(() => {
        const s = gs.current;
        if (!s.running || s.paused || s.gameOver || s.settling || s.holdUsed || !s.activePiece) return;
        if (s.heldType === null) {
            s.heldType = s.activePiece.type;
            s.holdUsed = true;
            s.activePiece = null;
            spawnPiece();
            return;
        }
        const swapped = createActivePiece(s.heldType);
        if (!canPlaceSand(s.sandGrid, swapped)) return;
        s.heldType = s.activePiece.type;
        s.activePiece = swapped;
        s.holdUsed = true;
        computeGhost();
        syncUI();
    }, [computeGhost, spawnPiece, syncUI]);

    const setPaused = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
        const s = gs.current;
        const newVal = typeof v === "function" ? v(s.paused) : v;
        s.paused = newVal;
        syncUI();
    }, [syncUI]);

    const resetGame = useCallback(() => {
        const s = gs.current;
        s.sandGrid = createSandGrid();
        s.activePiece = null;
        s.ghostY = 0;
        s.nextType = randomPieceType();
        s.heldType = null;
        s.holdUsed = false;
        s.score = 0;
        s.lines = 0;
        s.combo = 0;
        s.running = true;
        s.paused = false;
        s.gameOver = false;
        s.settling = false;
        s.gravityAcc = 0;
        s.stepToggle = false;
        s.flashRows = [];
        s.flashTimer = 0;
        s.phaseClears = 0;
        s.totalSandRows = 0;
        spawnPiece();
    }, [spawnPiece]);

    // ─── 키보드 ───
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const s = gs.current;
            if (!s.running || s.gameOver) return;
            if (e.key === "p" || e.key === "P") {
                s.paused = !s.paused;
                syncUI();
                return;
            }
            if (s.paused) return;
            switch (e.key) {
                case "ArrowLeft": e.preventDefault(); moveHorizontal(-1); break;
                case "ArrowRight": e.preventDefault(); moveHorizontal(1); break;
                case "ArrowDown": e.preventDefault(); softDrop(); break;
                case "ArrowUp": e.preventDefault(); rotatePiece(); break;
                case " ": e.preventDefault(); hardDrop(); break;
                case "c": case "C": e.preventDefault(); holdPiece(); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hardDrop, holdPiece, moveHorizontal, rotatePiece, softDrop, syncUI]);

    // ─── 하위호환 ───
    const renderedBoard = useMemo(() => {
        void boardVersion;
        const board = sandGridToCellBoard(gs.current.sandGrid);
        const piece = gs.current.activePiece;
        if (piece) {
            for (const [dx, dy] of PIECES[piece.type][piece.rotation]) {
                const x = piece.x + dx;
                const y = piece.y + dy;
                if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
                    board[y][x] = piece.type;
                }
            }
        }
        return board;
    }, [boardVersion]);

    const activePieceCells = useMemo(() => {
        void boardVersion;
        const cells = new Set<string>();
        const piece = gs.current.activePiece;
        if (!piece) return cells;
        for (const [dx, dy] of PIECES[piece.type][piece.rotation]) {
            cells.add(`${piece.y + dy}-${piece.x + dx}`);
        }
        return cells;
    }, [boardVersion]);

    const ghostCells = useMemo(() => {
        void boardVersion;
        const cells = new Set<string>();
        const piece = gs.current.activePiece;
        if (!piece) return cells;
        const gy = gs.current.ghostY;
        for (const [dx, dy] of PIECES[piece.type][piece.rotation]) {
            cells.add(`${gy + dy}-${piece.x + dx}`);
        }
        return cells;
    }, [boardVersion]);

    const applyGarbage = useCallback((garbageLines: Cell[][]) => {
        const s = gs.current;
        for (const line of garbageLines) {
            for (let i = 0; i < GRAIN_SCALE; i++) s.sandGrid.shift();
            for (let i = 0; i < GRAIN_SCALE; i++) {
                const sandRow = new Array<PieceType | null>(SAND_COLS).fill(null);
                for (let cx = 0; cx < BOARD_WIDTH; cx++) {
                    if (line[cx] !== null) {
                        for (let dx = 0; dx < GRAIN_SCALE; dx++) {
                            sandRow[cx * GRAIN_SCALE + dx] = line[cx];
                        }
                    }
                }
                s.sandGrid.push(sandRow);
            }
        }
        if (s.activePiece) {
            s.activePiece = { ...s.activePiece, y: Math.max(0, s.activePiece.y - garbageLines.length) };
        }
        computeGhost();
    }, [computeGhost]);

    return {
        gsRef: gs,
        score, lines, level, combo,
        running, paused, gameOver,
        settling: gs.current.settling,
        clearing: gs.current.settling,
        nextPieceType, heldPieceType, holdUsedThisTurn,
        dropIntervalMs,
        board: renderedBoard, renderedBoard,
        activePiece: gs.current.activePiece || createActivePiece("T"),
        activePieceCells, ghostCells,
        resetGame, moveHorizontal, rotatePiece, softDrop, hardDrop,
        holdPiece, setPaused, tick, applyGarbage,
    };
}
