import { useCallback, useEffect, useRef, useState } from "react";
import {
    type ActivePiece,
    type Board,
    type Cell,
    type PieceType,
    type RotationDirection,
    BOARD_HEIGHT,
    BOARD_WIDTH,
    PIECES,
    canPlace,
    clearCompletedLines,
    createBag,
    createBoard,
    createPiece,
    getGhostY,
    getLineClearScore,
    lockPiece,
    rotateWithKick,
} from "@/lib/tetrisCore";

export type { ActivePiece, Board, Cell, PieceType };
export { BOARD_HEIGHT, BOARD_WIDTH, PIECES };

export interface TetrisCallbacks {
    onLinesCleared: (lines: number, scoreGain: number, rows: number[]) => void;
    onHardDrop: (distance: number) => void;
    onGameOver: () => void;
}

interface GameState {
    board: Board;
    activePiece: ActivePiece | null;
    queue: PieceType[];
    heldPieceType: PieceType | null;
    holdUsed: boolean;
    score: number;
    lines: number;
    running: boolean;
    paused: boolean;
    gameOver: boolean;
}

const initialState = (): GameState => ({
    board: createBoard(),
    activePiece: null,
    queue: [],
    heldPieceType: null,
    holdUsed: false,
    score: 0,
    lines: 0,
    running: false,
    paused: false,
    gameOver: false,
});

const ensureQueue = (state: GameState) => {
    while (state.queue.length < 7) state.queue.push(...createBag());
};

export function useTetrisEngine(callbacks: TetrisCallbacks) {
    const stateRef = useRef<GameState>(initialState());
    const callbacksRef = useRef(callbacks);
    const [, render] = useState(0);
    callbacksRef.current = callbacks;

    const sync = useCallback(() => render((version) => version + 1), []);

    const endGame = useCallback(() => {
        const state = stateRef.current;
        state.activePiece = null;
        state.running = false;
        state.paused = false;
        state.gameOver = true;
        callbacksRef.current.onGameOver();
        sync();
    }, [sync]);

    const spawnPiece = useCallback((type?: PieceType, preserveHold = false) => {
        const state = stateRef.current;
        ensureQueue(state);
        const piece = createPiece(type ?? state.queue.shift()!);
        if (!canPlace(state.board, piece)) {
            endGame();
            return false;
        }
        state.activePiece = piece;
        if (!preserveHold) state.holdUsed = false;
        sync();
        return true;
    }, [endGame, sync]);

    const lockActivePiece = useCallback(() => {
        const state = stateRef.current;
        if (!state.activePiece) return;
        const locked = lockPiece(state.board, state.activePiece);
        const result = clearCompletedLines(locked);
        state.board = result.board;
        state.activePiece = null;

        if (result.cleared > 0) {
            const level = Math.floor(state.lines / 10) + 1;
            const scoreGain = getLineClearScore(result.cleared, level);
            state.lines += result.cleared;
            state.score += scoreGain;
            callbacksRef.current.onLinesCleared(result.cleared, scoreGain, result.rows);
        }
        spawnPiece();
    }, [spawnPiece]);

    const resetGame = useCallback(() => {
        const state = initialState();
        state.queue = [...createBag(), ...createBag()];
        state.running = true;
        stateRef.current = state;
        spawnPiece();
    }, [spawnPiece]);

    const moveHorizontal = useCallback((deltaX: number) => {
        const state = stateRef.current;
        if (!state.running || state.paused || !state.activePiece) return;
        const candidate = { ...state.activePiece, x: state.activePiece.x + deltaX };
        if (canPlace(state.board, candidate)) {
            state.activePiece = candidate;
            sync();
        }
    }, [sync]);

    const rotatePiece = useCallback((direction: RotationDirection = 1) => {
        const state = stateRef.current;
        if (!state.running || state.paused || !state.activePiece) return;
        const rotated = rotateWithKick(state.board, state.activePiece, direction);
        if (rotated) {
            state.activePiece = rotated;
            sync();
        }
    }, [sync]);

    const softDrop = useCallback(() => {
        const state = stateRef.current;
        if (!state.running || state.paused || !state.activePiece) return;
        const candidate = { ...state.activePiece, y: state.activePiece.y + 1 };
        if (canPlace(state.board, candidate)) {
            state.activePiece = candidate;
            state.score += 1;
            sync();
        } else {
            lockActivePiece();
        }
    }, [lockActivePiece, sync]);

    const gravityDrop = useCallback(() => {
        const state = stateRef.current;
        if (!state.running || state.paused || !state.activePiece) return;
        const candidate = { ...state.activePiece, y: state.activePiece.y + 1 };
        if (canPlace(state.board, candidate)) {
            state.activePiece = candidate;
            sync();
        } else {
            lockActivePiece();
        }
    }, [lockActivePiece, sync]);

    const hardDrop = useCallback(() => {
        const state = stateRef.current;
        if (!state.running || state.paused || !state.activePiece) return;
        const landingY = getGhostY(state.board, state.activePiece);
        const distance = landingY - state.activePiece.y;
        state.activePiece = { ...state.activePiece, y: landingY };
        state.score += distance * 2;
        callbacksRef.current.onHardDrop(distance);
        lockActivePiece();
    }, [lockActivePiece]);

    const holdPiece = useCallback(() => {
        const state = stateRef.current;
        if (!state.running || state.paused || !state.activePiece || state.holdUsed) return;
        const currentType = state.activePiece.type;
        const heldType = state.heldPieceType;
        state.heldPieceType = currentType;
        state.holdUsed = true;
        state.activePiece = null;
        spawnPiece(heldType ?? undefined, true);
    }, [spawnPiece]);

    const setPaused = useCallback((value: boolean | ((current: boolean) => boolean)) => {
        const state = stateRef.current;
        if (!state.running || state.gameOver) return;
        state.paused = typeof value === "function" ? value(state.paused) : value;
        sync();
    }, [sync]);

    const state = stateRef.current;
    const level = Math.floor(state.lines / 10) + 1;
    const dropIntervalMs = Math.max(100, 700 - (level - 1) * 55);

    useEffect(() => {
        if (!state.running || state.paused || state.gameOver) return;
        const timer = window.setInterval(gravityDrop, dropIntervalMs);
        return () => window.clearInterval(timer);
    }, [dropIntervalMs, gravityDrop, state.gameOver, state.paused, state.running]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const current = stateRef.current;
            if ((event.key === "p" || event.key === "P") && current.running && !current.gameOver) {
                event.preventDefault();
                setPaused((paused) => !paused);
                return;
            }
            if (!current.running || current.paused || current.gameOver) return;
            switch (event.key) {
                case "ArrowLeft": event.preventDefault(); moveHorizontal(-1); break;
                case "ArrowRight": event.preventDefault(); moveHorizontal(1); break;
                case "ArrowDown": event.preventDefault(); softDrop(); break;
                case "ArrowUp":
                case "x":
                case "X": event.preventDefault(); rotatePiece(1); break;
                case "z":
                case "Z": event.preventDefault(); rotatePiece(-1); break;
                case " ": event.preventDefault(); hardDrop(); break;
                case "c":
                case "C": event.preventDefault(); holdPiece(); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hardDrop, holdPiece, moveHorizontal, rotatePiece, setPaused, softDrop]);

    ensureQueue(state);
    const activePiece = state.activePiece;
    const ghostY = activePiece ? getGhostY(state.board, activePiece) : 0;

    return {
        board: state.board,
        activePiece,
        ghostY,
        nextPieceTypes: state.queue.slice(0, 3),
        heldPieceType: state.heldPieceType,
        holdUsedThisTurn: state.holdUsed,
        score: state.score,
        lines: state.lines,
        level,
        running: state.running,
        paused: state.paused,
        gameOver: state.gameOver,
        dropIntervalMs,
        resetGame,
        moveHorizontal,
        rotatePiece,
        softDrop,
        hardDrop,
        holdPiece,
        setPaused,
    };
}
