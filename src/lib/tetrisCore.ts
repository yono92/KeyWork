export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Cell = PieceType | null;
export type Board = Cell[][];
export type RotationDirection = 1 | -1;

export interface ActivePiece {
    type: PieceType;
    rotation: number;
    x: number;
    y: number;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const PIECE_TYPES: readonly PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

export const PIECES: Record<PieceType, readonly (readonly [number, number][])[]> = {
    I: [
        [[0, 1], [1, 1], [2, 1], [3, 1]],
        [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]],
        [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
    O: Array(4).fill([[1, 0], [2, 0], [1, 1], [2, 1]]),
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

export const createBoard = (): Board =>
    Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null));

export const createBag = (random: () => number = Math.random): PieceType[] => {
    const bag = [...PIECE_TYPES];
    for (let index = bag.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(random() * (index + 1));
        [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    return bag;
};

export const createPiece = (type: PieceType): ActivePiece => ({ type, rotation: 0, x: 3, y: 0 });

export const getPieceCells = (piece: ActivePiece): [number, number][] =>
    PIECES[piece.type][piece.rotation].map(([dx, dy]) => [piece.x + dx, piece.y + dy]);

export const canPlace = (board: Board, piece: ActivePiece): boolean =>
    getPieceCells(piece).every(([x, y]) =>
        x >= 0 && x < BOARD_WIDTH && y < BOARD_HEIGHT && (y < 0 || board[y][x] === null),
    );

export const rotateWithKick = (
    board: Board,
    piece: ActivePiece,
    direction: RotationDirection,
): ActivePiece | null => {
    const rotation = (piece.rotation + direction + 4) % 4;
    for (const offset of [0, -1, 1, -2, 2]) {
        const candidate = { ...piece, rotation, x: piece.x + offset };
        if (canPlace(board, candidate)) return candidate;
    }
    return null;
};

export const lockPiece = (board: Board, piece: ActivePiece): Board => {
    const next = board.map((row) => [...row]);
    for (const [x, y] of getPieceCells(piece)) {
        if (y >= 0 && y < BOARD_HEIGHT) next[y][x] = piece.type;
    }
    return next;
};

export const clearCompletedLines = (board: Board): { board: Board; cleared: number; rows: number[] } => {
    const rows: number[] = [];
    const remaining = board.filter((row, index) => {
        const complete = row.every((cell) => cell !== null);
        if (complete) rows.push(index);
        return !complete;
    });
    const emptyRows = Array.from({ length: rows.length }, () => Array<Cell>(BOARD_WIDTH).fill(null));
    return { board: [...emptyRows, ...remaining], cleared: rows.length, rows };
};

export const getGhostY = (board: Board, piece: ActivePiece): number => {
    let ghostY = piece.y;
    while (canPlace(board, { ...piece, y: ghostY + 1 })) ghostY++;
    return ghostY;
};

export const getLineClearScore = (lines: number, level: number): number =>
    ([0, 100, 300, 500, 800][lines] ?? 0) * level;
