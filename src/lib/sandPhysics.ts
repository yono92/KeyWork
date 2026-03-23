/**
 * Sand physics simulation for Sandtris.
 * Each tetris cell subdivides into GRAIN_SCALE x GRAIN_SCALE sand grains.
 * Grains obey gravity: fall down, slide diagonally if blocked.
 */

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Grain = PieceType | null;
export type SandGrid = Grain[][];

export const GRAIN_SCALE = 12;
export const SAND_COLS = 10 * GRAIN_SCALE; // 120
export const SAND_ROWS = 20 * GRAIN_SCALE; // 240

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

/**
 * 같은 색 연결 그룹(BFS 4방향) 중 가로 폭을 완전히 관통하는 그룹 탐색.
 * 연결된 같은 색 덩어리가 왼쪽 벽(x=0)부터 오른쪽 벽(x=SAND_COLS-1)까지
 * 닿아있으면 해당 그룹 전체를 클리어.
 */
export function findConnectedGroups(grid: SandGrid): { flashGrid: Uint8Array; count: number } | null {
    const total = SAND_ROWS * SAND_COLS;
    const visited = new Uint8Array(total);
    const result = new Uint8Array(total);
    let totalCount = 0;

    const queue: number[] = [];

    for (let y = 0; y < SAND_ROWS; y++) {
        for (let x = 0; x < SAND_COLS; x++) {
            const idx = y * SAND_COLS + x;
            if (visited[idx] || grid[y][x] === null) continue;

            const type = grid[y][x];
            let head = 0;
            queue.length = 0;
            queue.push(y, x);
            visited[idx] = 1;
            const groupIndices: number[] = [idx];
            let minX = x;
            let maxX = x;

            while (head < queue.length) {
                const cy = queue[head++];
                const cx = queue[head++];
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                // 4방향
                if (cy > 0) { const ni = (cy-1)*SAND_COLS+cx; if (!visited[ni] && grid[cy-1][cx] === type) { visited[ni]=1; queue.push(cy-1,cx); groupIndices.push(ni); } }
                if (cy < SAND_ROWS-1) { const ni = (cy+1)*SAND_COLS+cx; if (!visited[ni] && grid[cy+1][cx] === type) { visited[ni]=1; queue.push(cy+1,cx); groupIndices.push(ni); } }
                if (cx > 0) { const ni = cy*SAND_COLS+cx-1; if (!visited[ni] && grid[cy][cx-1] === type) { visited[ni]=1; queue.push(cy,cx-1); groupIndices.push(ni); } }
                if (cx < SAND_COLS-1) { const ni = cy*SAND_COLS+cx+1; if (!visited[ni] && grid[cy][cx+1] === type) { visited[ni]=1; queue.push(cy,cx+1); groupIndices.push(ni); } }
            }

            // 왼쪽 벽(0)부터 오른쪽 벽(SAND_COLS-1)까지 관통하면 클리어
            if (minX === 0 && maxX === SAND_COLS - 1) {
                for (const gi of groupIndices) result[gi] = 1;
                totalCount += groupIndices.length;
            }
        }
    }
    return totalCount > 0 ? { flashGrid: result, count: totalCount } : null;
}

/** flashGrid에 표시된 알갱이를 그리드에서 제거 */
export function removeMarkedGrains(grid: SandGrid, flashGrid: Uint8Array): void {
    for (let y = 0; y < SAND_ROWS; y++) {
        for (let x = 0; x < SAND_COLS; x++) {
            if (flashGrid[y * SAND_COLS + x]) grid[y][x] = null;
        }
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
