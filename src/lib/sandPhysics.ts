/**
 * Sand physics simulation for Sandtris.
 * Each tetris cell subdivides into GRAIN_SCALE x GRAIN_SCALE sand grains.
 * Grains obey gravity: fall down, slide diagonally if blocked.
 */

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Grain = PieceType | null;
export type SandGrid = Grain[][];

export const GRAIN_SCALE = 24;
export const SAND_COLS = 10 * GRAIN_SCALE; // 240
export const SAND_ROWS = 20 * GRAIN_SCALE; // 480

export function createSandGrid(): SandGrid {
    return Array.from({ length: SAND_ROWS }, () => new Array<Grain>(SAND_COLS).fill(null));
}

/** 테트리스 셀 영역에 모래 알갱이가 있는지 확인 */
export function isCellBlocked(grid: SandGrid, cellX: number, cellY: number): boolean {
    const sx = cellX * GRAIN_SCALE;
    const sy = cellY * GRAIN_SCALE;
    for (let dy = 0; dy < GRAIN_SCALE; dy++) {
        for (let dx = 0; dx < GRAIN_SCALE; dx++) {
            const gy = sy + dy;
            const gx = sx + dx;
            if (gy >= 0 && gy < SAND_ROWS && gx >= 0 && gx < SAND_COLS && grid[gy][gx] !== null) {
                return true;
            }
        }
    }
    return false;
}

/** 테트리스 셀을 모래 알갱이로 채움 */
export function stampCell(grid: SandGrid, cellX: number, cellY: number, type: PieceType): void {
    const sx = cellX * GRAIN_SCALE;
    const sy = cellY * GRAIN_SCALE;
    for (let dy = 0; dy < GRAIN_SCALE; dy++) {
        for (let dx = 0; dx < GRAIN_SCALE; dx++) {
            const gy = sy + dy;
            const gx = sx + dx;
            if (gy >= 0 && gy < SAND_ROWS && gx >= 0 && gx < SAND_COLS) {
                grid[gy][gx] = type;
            }
        }
    }
}

/**
 * 모래 물리 1스텝. 아래에서 위로 스캔.
 * 각 알갱이: 아래로 떨어지거나, 막혀있으면 대각선으로 미끄러짐.
 * leftToRight를 번갈아 호출하면 좌우 편향 방지.
 * 반환: 이동이 있었으면 true.
 */
export function simulateStep(grid: SandGrid, leftToRight: boolean): boolean {
    let moved = false;
    for (let y = SAND_ROWS - 2; y >= 0; y--) {
        for (let i = 0; i < SAND_COLS; i++) {
            const x = leftToRight ? i : SAND_COLS - 1 - i;
            if (grid[y][x] === null) continue;

            // 바로 아래가 비었으면 떨어짐
            if (grid[y + 1][x] === null) {
                grid[y + 1][x] = grid[y][x];
                grid[y][x] = null;
                moved = true;
                continue;
            }

            // 대각선 슬라이드
            const canL = x > 0 && grid[y + 1][x - 1] === null;
            const canR = x < SAND_COLS - 1 && grid[y + 1][x + 1] === null;

            if (canL && canR) {
                const nx = Math.random() < 0.5 ? x - 1 : x + 1;
                grid[y + 1][nx] = grid[y][x];
                grid[y][x] = null;
                moved = true;
            } else if (canL) {
                grid[y + 1][x - 1] = grid[y][x];
                grid[y][x] = null;
                moved = true;
            } else if (canR) {
                grid[y + 1][x + 1] = grid[y][x];
                grid[y][x] = null;
                moved = true;
            }
        }
    }
    return moved;
}

/** 같은 색으로 가득 찬 가로줄 찾기. 모든 알갱이가 같은 PieceType이어야 함. */
export function findFullRows(grid: SandGrid): number[] {
    const rows: number[] = [];
    for (let y = 0; y < SAND_ROWS; y++) {
        const first = grid[y][0];
        if (first === null) continue;
        if (grid[y].every((g) => g === first)) {
            rows.push(y);
        }
    }
    return rows;
}

/** 행 제거 후 위에 빈 행 추가 */
export function removeRows(grid: SandGrid, rows: number[]): void {
    const sorted = [...rows].sort((a, b) => b - a);
    for (const y of sorted) {
        grid.splice(y, 1);
        grid.unshift(new Array<Grain>(SAND_COLS).fill(null));
    }
}


/** 30x60 모래 그리드를 10x20 Cell[][] 로 다운샘플 (멀티플레이어 브로드캐스트용) */
export function sandGridToCellBoard(grid: SandGrid): (PieceType | null)[][] {
    const BOARD_W = 10;
    const BOARD_H = 20;
    const board: (PieceType | null)[][] = Array.from({ length: BOARD_H }, () =>
        new Array<PieceType | null>(BOARD_W).fill(null),
    );

    for (let cy = 0; cy < BOARD_H; cy++) {
        for (let cx = 0; cx < BOARD_W; cx++) {
            // 3x3 영역에서 가장 많은 타입을 선택 (majority vote)
            const counts: Record<string, number> = {};
            let maxType: PieceType | null = null;
            let maxCount = 0;

            for (let dy = 0; dy < GRAIN_SCALE; dy++) {
                for (let dx = 0; dx < GRAIN_SCALE; dx++) {
                    const g = grid[cy * GRAIN_SCALE + dy][cx * GRAIN_SCALE + dx];
                    if (g !== null) {
                        counts[g] = (counts[g] || 0) + 1;
                        if (counts[g] > maxCount) {
                            maxCount = counts[g];
                            maxType = g;
                        }
                    }
                }
            }
            board[cy][cx] = maxType;
        }
    }
    return board;
}
