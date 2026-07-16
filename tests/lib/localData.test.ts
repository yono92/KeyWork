import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    LOCAL_DATA_KEYS,
    appendLocalScore,
    loadCustomTexts,
    loadLocalScores,
    saveCustomTexts,
} from "@/lib/localData";

describe("localData", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it("falls back safely when stored JSON is corrupted", () => {
        localStorage.setItem(LOCAL_DATA_KEYS.customTexts, "not-json");
        localStorage.setItem(LOCAL_DATA_KEYS.scores, "[");

        expect(loadCustomTexts()).toEqual([]);
        expect(loadLocalScores()).toEqual([]);
    });

    it("round-trips custom text data", () => {
        const texts = [{
            id: 1,
            title: "연습",
            content: "로컬 연습 문장",
            language: "korean" as const,
            created_at: "2026-07-16T00:00:00.000Z",
            updated_at: "2026-07-16T00:00:00.000Z",
        }];

        expect(saveCustomTexts(texts)).toBe(true);
        expect(loadCustomTexts()).toEqual(texts);
    });

    it("normalizes appended scores and rejects invalid stored rows", () => {
        const score = appendLocalScore({
            game_mode: "practice",
            score: -10.4,
            wpm: 52.6,
            accuracy: 123,
        });

        expect(score).toMatchObject({ score: 0, wpm: 53, accuracy: 100 });

        localStorage.setItem(LOCAL_DATA_KEYS.scores, JSON.stringify([
            score,
            { ...score, id: 2, game_mode: "unknown" },
            { ...score, id: 3, score: "bad" },
        ]));
        expect(loadLocalScores()).toEqual([score]);
    });

    it("does not throw when browser storage rejects writes", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("storage blocked");
        });

        expect(saveCustomTexts([])).toBe(false);
        expect(() => appendLocalScore({ game_mode: "tetris", score: 100 })).not.toThrow();
    });
});
