import {
    calculateHangulAccuracy,
    compareHangulJamo,
    countKeystrokes,
    decomposeHangul,
    isHangul,
} from "../../src/utils/hangulUtils";

describe("hangulUtils", () => {
    it("decomposes hangul syllables", () => {
        expect(decomposeHangul("\uAC00").length).toBeGreaterThan(1);
    });

    it("detects hangul correctly", () => {
        expect(isHangul("\uAC00")).toBe(true);
        expect(isHangul("A")).toBe(false);
    });

    it("counts keystrokes for mixed text", () => {
        expect(countKeystrokes("ab")).toBe(2);
        expect(countKeystrokes("\uAC00")).toBeGreaterThanOrEqual(2);
    });

    it("compares jamo states", () => {
        const result = compareHangulJamo("\uAC00", "\uAC00");
        expect(result.every((v) => v === "correct")).toBe(true);
    });

    it("calculates accuracy in range 0..100", () => {
        const perfect = calculateHangulAccuracy("\uAC00\uB098", "\uAC00\uB098");
        const partial = calculateHangulAccuracy("\uAC00\uB098", "\uAC00");
        expect(perfect).toBe(100);
        expect(partial).toBeGreaterThanOrEqual(0);
        expect(partial).toBeLessThanOrEqual(100);
    });
});
