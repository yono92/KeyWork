import { describe, expect, it } from "vitest";
import { isTooSimilarWord, pickDiverseWord } from "../../src/utils/wordDiversity";

describe("wordDiversity", () => {
    it("flags similar korean prefix patterns", () => {
        expect(isTooSimilarWord("사과즙", ["사과", "사랑"], "korean")).toBe(true);
        expect(isTooSimilarWord("바다", ["사과", "사랑"], "korean")).toBe(false);
    });

    it("flags attached prefix-family words", () => {
        expect(isTooSimilarWord("학교생활", ["학교"], "korean")).toBe(true);
        expect(isTooSimilarWord("사과", ["사과즙"], "korean")).toBe(true);
    });

    it("flags meaningful contained words", () => {
        expect(isTooSimilarWord("대한민국사람", ["대한민국"], "korean")).toBe(true);
    });

    it("prefers less repetitive candidates", () => {
        const picked = pickDiverseWord(
            ["사과즙", "바다", "사과나무", "학교생활"],
            ["사과", "사랑"],
            "korean",
            0
        );

        expect(["바다", "학교생활"]).toContain(picked);
        expect(["사과즙", "사과나무"]).not.toContain(picked);
    });
});
