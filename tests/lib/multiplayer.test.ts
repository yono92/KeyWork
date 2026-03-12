import { describe, it, expect } from "vitest";
import {
    serializeBoard,
    deserializeBoard,
    createGarbageLines,
    addGarbageToBoard,
    getGarbageCount,
} from "@/hooks/useMultiplayerTetris";
import {
    getRoomCutoffIso,
    isOwnBroadcast,
    isRoomExpired,
    pickStartingTurnUserId,
} from "@/lib/multiplayerRealtime";
import { BOARD_WIDTH, BOARD_HEIGHT } from "@/hooks/useTetrisEngine";
import type { Cell } from "@/hooks/useTetrisEngine";

describe("serializeBoard / deserializeBoard", () => {
    it("round-trips an empty board", () => {
        const board: Cell[][] = Array.from({ length: 3 }, () =>
            Array(BOARD_WIDTH).fill(null),
        );
        const serialized = serializeBoard(board);
        expect(serialized.every((row) => row.every((v) => v === 0))).toBe(true);
        const restored = deserializeBoard(serialized);
        expect(restored).toEqual(board);
    });

    it("round-trips a board with pieces", () => {
        const board: Cell[][] = [
            ["I", "O", "T", "S", "Z", "J", "L", null, null, null],
            Array(BOARD_WIDTH).fill(null),
        ];
        const serialized = serializeBoard(board);
        expect(serialized[0]).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 0, 0]);
        const restored = deserializeBoard(serialized);
        expect(restored).toEqual(board);
    });
});

describe("getGarbageCount", () => {
    it("returns 0 for 0 or 1 line", () => {
        expect(getGarbageCount(0)).toBe(0);
        expect(getGarbageCount(1)).toBe(0);
    });

    it("returns 1 for 2 lines", () => {
        expect(getGarbageCount(2)).toBe(1);
    });

    it("returns 2 for 3 lines", () => {
        expect(getGarbageCount(3)).toBe(2);
    });

    it("returns 4 for tetris (4 lines)", () => {
        expect(getGarbageCount(4)).toBe(4);
    });
});

describe("createGarbageLines", () => {
    it("creates the right number of lines", () => {
        const lines = createGarbageLines(3);
        expect(lines).toHaveLength(3);
    });

    it("each line has exactly one gap (null)", () => {
        const lines = createGarbageLines(5);
        for (const line of lines) {
            expect(line).toHaveLength(BOARD_WIDTH);
            const nullCount = line.filter((c) => c === null).length;
            expect(nullCount).toBe(1);
        }
    });

    it("non-gap cells are Z pieces", () => {
        const lines = createGarbageLines(2);
        for (const line of lines) {
            for (const cell of line) {
                if (cell !== null) expect(cell).toBe("Z");
            }
        }
    });
});

describe("addGarbageToBoard", () => {
    it("adds garbage lines at the bottom, shifting rows up", () => {
        const board: Cell[][] = Array.from({ length: BOARD_HEIGHT }, () =>
            Array(BOARD_WIDTH).fill(null),
        );
        // Place something in the last row
        board[BOARD_HEIGHT - 1][0] = "I";
        const garbage = createGarbageLines(2);
        const result = addGarbageToBoard(board, garbage);
        expect(result).toHaveLength(BOARD_HEIGHT);
        // Garbage at bottom
        expect(result[BOARD_HEIGHT - 1]).toBe(garbage[1]);
        expect(result[BOARD_HEIGHT - 2]).toBe(garbage[0]);
        // Original last row moved up by 2
        expect(result[BOARD_HEIGHT - 3][0]).toBe("I");
    });
});

describe("multiplayer realtime helpers", () => {
    it("identifies self-broadcast payloads", () => {
        expect(isOwnBroadcast({ senderId: "user-1" }, "user-1")).toBe(true);
        expect(isOwnBroadcast({ senderId: "user-2" }, "user-1")).toBe(false);
    });

    it("picks the correct starting player id", () => {
        expect(pickStartingTurnUserId("host-1", "guest-1", true)).toBe("host-1");
        expect(pickStartingTurnUserId("host-1", "guest-1", false)).toBe("guest-1");
    });

    it("marks rooms older than the ttl as expired", () => {
        const now = Date.parse("2026-03-12T00:00:00.000Z");
        const freshRoom = "2026-03-11T23:30:00.000Z";
        const staleRoom = "2026-03-11T22:30:00.000Z";

        expect(isRoomExpired(freshRoom, now)).toBe(false);
        expect(isRoomExpired(staleRoom, now)).toBe(true);
        expect(getRoomCutoffIso(now)).toBe("2026-03-11T23:00:00.000Z");
    });
});
