import { describe, expect, it } from "vitest";
import { isTooSimilarWord, pickDiverseWord } from "../../src/utils/wordDiversity";

describe("wordDiversity", () => {
    it("flags similar korean prefix patterns", () => {
        expect(isTooSimilarWord("사과즙", ["사과", "사랑"], "korean")).toBe(true);
        expect(isTooSimilarWord("바다", ["사과", "사랑"], "korean")).toBe(false);
    });

    it("prefers less repetitive candidates", () => {
        const picked = pickDiverseWord(
            ["사과즙", "바다", "사과나무"],
            ["사과", "사랑"],
            "korean",
            0
        );

        expect(picked).toBe("바다");
    });
});
