import { describe, expect, it } from "vitest";
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
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

describe("tetrisCore", () => {
    it("7-bag에는 일곱 종류가 한 번씩 들어간다", () => {
        const bag = createBag(() => 0.42);
        expect(new Set(bag).size).toBe(7);
        expect(bag).toHaveLength(7);
    });

    it("보드 경계와 쌓인 블록의 충돌을 감지한다", () => {
        const board = createBoard();
        expect(canPlace(board, createPiece("T"))).toBe(true);
        expect(canPlace(board, { ...createPiece("I"), x: -2 })).toBe(false);
        board[1][4] = "J";
        expect(canPlace(board, createPiece("T"))).toBe(false);
    });

    it("벽 근처 회전 시 간단한 월 킥을 적용한다", () => {
        const rotated = rotateWithKick(createBoard(), { ...createPiece("I"), rotation: 1, x: -2 }, 1);
        expect(rotated).not.toBeNull();
        expect(rotated?.x).toBe(0);
    });

    it("완성된 줄을 제거하고 위쪽에 빈 줄을 채운다", () => {
        const board = createBoard();
        board[BOARD_HEIGHT - 1].fill("I");
        board[BOARD_HEIGHT - 2][0] = "T";
        const result = clearCompletedLines(board);
        expect(result.cleared).toBe(1);
        expect(result.rows).toEqual([BOARD_HEIGHT - 1]);
        expect(result.board[BOARD_HEIGHT - 1][0]).toBe("T");
        expect(result.board[0]).toEqual(Array(BOARD_WIDTH).fill(null));
    });

    it("고스트 위치와 고전식 줄 점수를 계산한다", () => {
        const board = createBoard();
        const piece = createPiece("O");
        expect(getGhostY(board, piece)).toBe(18);
        expect(getLineClearScore(1, 2)).toBe(200);
        expect(getLineClearScore(4, 3)).toBe(2400);
    });

    it("블록을 보드에 고정한다", () => {
        const board = lockPiece(createBoard(), { ...createPiece("O"), y: 18 });
        expect(board[18][4]).toBe("O");
        expect(board[19][5]).toBe("O");
    });
});
