import { describe, expect, it } from "vitest";
import {
    calculateFallingWordsMatchScore,
    findClaimableFallingWord,
} from "@/lib/fallingWords";

describe("fallingWords helpers", () => {
    it("does not claim the same word twice once it is locked", () => {
        const words = [
            { id: 1, text: "apple", status: "falling" as const },
            { id: 2, text: "banana", status: "falling" as const },
        ];

        expect(findClaimableFallingWord(words, "apple", new Set())).toEqual(words[0]);
        expect(findClaimableFallingWord(words, "apple", new Set([1]))).toBeNull();
    });

    it("calculates combo and score for a normal match", () => {
        expect(calculateFallingWordsMatchScore(2, 5, 800)).toEqual({
            nextCombo: 3,
            comboMultiplier: 1.6,
            finalScore: 80,
            triggeredComboMilestone: false,
            triggeredComboSound: false,
        });
    });

    it("caps combo multiplier and applies rapid bonus", () => {
        expect(calculateFallingWordsMatchScore(10, 4, 300)).toEqual({
            nextCombo: 11,
            comboMultiplier: 2,
            finalScore: 120,
            triggeredComboMilestone: false,
            triggeredComboSound: true,
        });
    });
});
