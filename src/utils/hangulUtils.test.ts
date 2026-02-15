import {
    calculateHangulAccuracy,
    compareHangulJamo,
    countKeystrokes,
    decomposeHangul,
    isHangul,
} from "./hangulUtils";

describe("hangulUtils", () => {
    it("decomposes hangul syllables", () => {
        expect(decomposeHangul("각").length).toBeGreaterThan(1);
    });

    it("detects hangul correctly", () => {
        expect(isHangul("가")).toBe(true);
        expect(isHangul("A")).toBe(false);
    });

    it("counts keystrokes for mixed text", () => {
        expect(countKeystrokes("ab")).toBe(2);
        expect(countKeystrokes("가")).toBeGreaterThanOrEqual(2);
    });

    it("compares jamo states", () => {
        const result = compareHangulJamo("가", "가");
        expect(result.every((v) => v === "correct")).toBe(true);
    });

    it("calculates accuracy in range 0..100", () => {
        const perfect = calculateHangulAccuracy("가나", "가나");
        const partial = calculateHangulAccuracy("가나", "가");
        expect(perfect).toBe(100);
        expect(partial).toBeGreaterThanOrEqual(0);
        expect(partial).toBeLessThanOrEqual(100);
    });
});
