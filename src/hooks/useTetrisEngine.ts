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
    I: { face: "#2288ee", hi: "#4499ee", lo: "#0a3366" },    // Water
    O: { face: "#c4a030", hi: "#ddcc55", lo: "#665510" },    // Sand
    T: { face: "#8844bb", hi: "#aa66dd", lo: "#331166" },    // Mountain
    S: { face: "#1a7a2e", hi: "#44bb55", lo: "#0a3312" },    // Forest
    Z: { face: "#cc2222", hi: "#ee5555", lo: "#550808" },    // Lava
    J: { face: "#1144aa", hi: "#3366cc", lo: "#061a44" },    // Ocean
    L: { face: "#cc6622", hi: "#ee8844", lo: "#552200" },    // Clay
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

/**
 * 모래 물리: 입자들이 아래로 떨어지고, 대각선으로 미끄러짐.
 * 한 스텝을 실행하고, 변화가 있었는지 반환.
 */
const sandSettleStep = (board: Cell[][]): { changed: boolean; board: Cell[][] } => {
    const next = board.map((row) => [...row]);
    let changed = false;

    // 아래에서 위로 순회 (바닥부터 정착)
    for (let y = BOARD_HEIGHT - 2; y >= 0; y--) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cell = next[y][x];
            if (cell === null) continue;

            // 1. 바로 아래가 비었으면 떨어짐
            if (next[y + 1][x] === null) {
                next[y + 1][x] = cell;
                next[y][x] = null;
                changed = true;
                continue;
            }

            // 2. 아래가 차있으면 좌하/우하 중 빈 곳으로 미끄러짐
            const canLeft = x > 0 && next[y + 1][x - 1] === null && next[y][x - 1] === null;
            const canRight = x < BOARD_WIDTH - 1 && next[y + 1][x + 1] === null && next[y][x + 1] === null;

            if (canLeft && canRight) {
                // 랜덤으로 한 방향 선택
                const goLeft = Math.random() < 0.5;
                const nx = goLeft ? x - 1 : x + 1;
                next[y + 1][nx] = cell;
                next[y][x] = null;
                changed = true;
            } else if (canLeft) {
                next[y + 1][x - 1] = cell;
                next[y][x] = null;
                changed = true;
            } else if (canRight) {
                next[y + 1][x + 1] = cell;
                next[y][x] = null;
                changed = true;
            }
        }
    }

    return { changed, board: next };
};

/**
 * 모래 물리 시뮬레이션을 안정될 때까지 실행.
 * 최대 maxSteps 스텝까지만 실행 (무한루프 방지).
 */
export const sandSettleFull = (board: Cell[][], maxSteps = 200): Cell[][] => {
    let current = board;
    for (let i = 0; i < maxSteps; i++) {
        const result = sandSettleStep(current);
        if (!result.changed) break;
        current = result.board;
    }
    return current;
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

/** 모래 정착 애니메이션 간격 (ms) */
const SAND_SETTLE_INTERVAL = 30;

export interface TetrisCallbacks {
    onLinesCleared: (rows: number[], removed: number, totalGain: number, combo: number) => void;
    onHardDrop: (distance: number, landingRow: number) => void;
    onGameOver: () => void;
}

/**
 * Tetris 핵심 게임 엔진 — 모래 물리 + 보드, 피스, 충돌, 점수, 콤보, gravity, 키보드 입력
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
    const [settling, setSettling] = useState(false);

    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const softDropRef = useRef<() => void>(() => {});

    const level = Math.min(10, Math.floor(lines / 10) + 1);
    const dropIntervalMs = isMobile
        ? Math.max(100, 460 - (level - 1) * 50)
        : Math.max(140, 620 - (level - 1) * 45);

    const resetGame = useCallback(() => {
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
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
        setSettling(false);
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

    /**
     * 모래 정착 시뮬레이션을 애니메이션으로 실행.
     * 각 스텝마다 보드를 업데이트해서 모래가 흘러내리는 걸 보여줌.
     * 완료 후 라인 클리어 체크.
     */
    const runSandSettle = useCallback((startBoard: Cell[][], afterSettle: (finalBoard: Cell[][]) => void) => {
        setSettling(true);
        let current = startBoard;
        let stepCount = 0;

        const doStep = () => {
            const result = sandSettleStep(current);
            stepCount++;
            if (result.changed && stepCount < 200) {
                current = result.board;
                setBoard(current);
                settleTimerRef.current = setTimeout(doStep, SAND_SETTLE_INTERVAL);
            } else {
                setSettling(false);
                afterSettle(current);
            }
        };

        // 첫 스텝은 즉시 실행
        doStep();
    }, []);

    const finishLock = useCallback((merged: Cell[][], comboVal: number, lvl: number, spawnFn: (b: Cell[][]) => void) => {
        // 모래 정착 후 라인 클리어 처리
        runSandSettle(merged, (settledBoard) => {
            const { nextBoard, removed, clearedRows } = clearFullLines(settledBoard);

            if (removed > 0) {
                const newCombo = comboVal + 1;
                setCombo(newCombo);
                const lineScore = getLineScore(removed, lvl);
                const comboBonus = newCombo >= 1 ? 50 * newCombo * lvl : 0;
                const totalGain = lineScore + comboBonus;
                setLines((prev) => prev + removed);
                setScore((prev) => prev + totalGain);

                // Phase 1: 플래시 애니메이션
                setBoard(settledBoard);
                setClearing(true);
                setActivePiece((prev) => ({ ...prev, y: -10 }));
                callbacksRef.current.onLinesCleared(clearedRows, removed, totalGain, newCombo);

                // Phase 2: 행 제거 후 다시 모래 정착
                clearTimerRef.current = setTimeout(() => {
                    setClearing(false);
                    // 라인 클리어 후 또 모래가 흘러내림
                    runSandSettle(nextBoard, (finalBoard) => {
                        setBoard(finalBoard);
                        // 추가 라인 클리어 체크 (연쇄 클리어)
                        const chain = clearFullLines(finalBoard);
                        if (chain.removed > 0) {
                            const chainCombo = newCombo + 1;
                            setCombo(chainCombo);
                            const chainScore = getLineScore(chain.removed, lvl);
                            const chainBonus = chainCombo >= 1 ? 50 * chainCombo * lvl : 0;
                            const chainTotal = chainScore + chainBonus;
                            setLines((prev) => prev + chain.removed);
                            setScore((prev) => prev + chainTotal);
                            callbacksRef.current.onLinesCleared(chain.clearedRows, chain.removed, chainTotal, chainCombo);
                            setBoard(chain.nextBoard);
                            // 한 번 더 모래 정착
                            runSandSettle(chain.nextBoard, (finalBoard2) => {
                                setBoard(finalBoard2);
                                spawnFn(finalBoard2);
                            });
                        } else {
                            spawnFn(finalBoard);
                        }
                    });
                }, LINE_CLEAR_DELAY);
            } else {
                setCombo(0);
                setBoard(settledBoard);
                spawnFn(settledBoard);
            }
        });
    }, [runSandSettle]);

    const lockPiece = useCallback(() => {
        const merged = mergePiece(board, activePiece);
        // 활성 피스를 화면 밖으로
        setActivePiece((prev) => ({ ...prev, y: -10 }));
        setBoard(merged);
        finishLock(merged, combo, level, spawnFromQueue);
    }, [activePiece, board, combo, finishLock, level, spawnFromQueue]);

    const moveHorizontal = useCallback(
        (deltaX: number) => {
            if (!running || paused || gameOver || clearing || settling) return;
            if (!canPlace(board, activePiece, deltaX, 0)) return;
            setActivePiece((prev) => ({ ...prev, x: prev.x + deltaX }));
        },
        [activePiece, board, clearing, gameOver, paused, running, settling],
    );

    const rotatePiece = useCallback(() => {
        if (!running || paused || gameOver || clearing || settling) return;
        const nextRotation = (activePiece.rotation + 1) % PIECES[activePiece.type].length;
        const kicks = [0, -1, 1, -2, 2];
        const kickX = kicks.find((offset) => canPlace(board, activePiece, offset, 0, nextRotation));
        if (kickX === undefined) return;

        setActivePiece((prev) => ({
            ...prev,
            x: prev.x + kickX,
            rotation: nextRotation,
        }));
    }, [activePiece, board, clearing, gameOver, paused, running, settling]);

    const softDrop = useCallback(() => {
        if (!running || paused || gameOver || clearing || settling) return;
        if (canPlace(board, activePiece, 0, 1)) {
            setActivePiece((prev) => ({ ...prev, y: prev.y + 1 }));
            return;
        }
        lockPiece();
    }, [activePiece, board, clearing, gameOver, lockPiece, paused, running, settling]);

    useEffect(() => {
        softDropRef.current = softDrop;
    }, [softDrop]);

    const hardDrop = useCallback(() => {
        if (!running || paused || gameOver || clearing || settling) return;
        let distance = 0;
        while (canPlace(board, activePiece, 0, distance + 1)) {
            distance += 1;
        }
        const droppedPiece = { ...activePiece, y: activePiece.y + distance };
        const merged = mergePiece(board, droppedPiece);

        const landingRow = Math.max(...PIECES[activePiece.type][activePiece.rotation].map(([, dy]) => droppedPiece.y + dy));
        callbacksRef.current.onHardDrop(distance, landingRow);

        // 활성 피스를 화면 밖으로
        setActivePiece((prev) => ({ ...prev, y: -10 }));
        setBoard(merged);
        finishLock(merged, combo, level, spawnFromQueue);
    }, [activePiece, board, clearing, combo, finishLock, gameOver, level, paused, running, settling, spawnFromQueue]);

    const holdPiece = useCallback(() => {
        if (!running || paused || gameOver || clearing || settling || holdUsedThisTurn) return;

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
    }, [activePiece, board, clearing, gameOver, heldPieceType, holdUsedThisTurn, paused, running, settling, spawnFromQueue]);

    // Gravity loop — RAF 누적으로 비활성 탭 복귀/저사양 환경의 setInterval 오차를 줄임
    useEffect(() => {
        if (!running || paused || gameOver || clearing || settling) return;

        let frameId = 0;
        let lastTimestamp = 0;
        let accumulated = 0;

        const tick = (timestamp: number) => {
            if (!lastTimestamp) {
                lastTimestamp = timestamp;
                frameId = window.requestAnimationFrame(tick);
                return;
            }

            const delta = Math.min(timestamp - lastTimestamp, 250);
            lastTimestamp = timestamp;
            accumulated += delta;

            while (accumulated >= dropIntervalMs) {
                softDropRef.current();
                accumulated -= dropIntervalMs;
            }

            frameId = window.requestAnimationFrame(tick);
        };

        frameId = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frameId);
    }, [clearing, dropIntervalMs, gameOver, paused, running, settling]);

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

    /** 활성 피스가 차지하는 셀 좌표 Set ("row-col") — 모래 렌더링 구분용 */
    const activePieceCells = useMemo(() => {
        const cells = new Set<string>();
        if (!running || gameOver) return cells;
        for (const [dx, dy] of PIECES[activePiece.type][activePiece.rotation]) {
            const x = activePiece.x + dx;
            const y = activePiece.y + dy;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
                cells.add(`${y}-${x}`);
            }
        }
        return cells;
    }, [activePiece, gameOver, running]);

    const ghostCells = useMemo(() => {
        if (!running || gameOver || clearing || settling) return new Set<string>();
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
    }, [activePiece, board, clearing, gameOver, running, settling]);

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
        settling,
        dropIntervalMs,
        renderedBoard,
        activePieceCells,
        ghostCells,
        resetGame,
        moveHorizontal,
        rotatePiece,
        softDrop,
        hardDrop,
        holdPiece,
        setPaused,
        // 외부에서 가비지 라인을 보드에 적용할 때 사용
        applyGarbage: useCallback((garbageLines: Cell[][]) => {
            setBoard((prev) => {
                const newBoard = [...prev.slice(garbageLines.length), ...garbageLines];
                return newBoard;
            });
            // 가비지로 인해 활성 피스가 위로 밀림
            setActivePiece((prev) => ({
                ...prev,
                y: Math.max(0, prev.y - garbageLines.length),
            }));
        }, []),
    };
}
