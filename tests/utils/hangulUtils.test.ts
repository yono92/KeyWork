import {
    calculateHangulAccuracy,
    compareHangulJamo,
    countCorrectJamo,
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

    it("penalizes extra input in accuracy", () => {
        // "한글" + 초과 입력 → 100%가 아니어야 함
        const acc = calculateHangulAccuracy("\uD55C\uAE00", "\uD55C\uAE00\uCD94\uAC00");
        expect(acc).toBeLessThan(100);
    });

    it("counts correct jamo keystrokes at jamo level", () => {
        // 완벽 일치: correct === total
        const perfect = countCorrectJamo("\uD55C\uAE00", "\uD55C\uAE00");
        expect(perfect.correct).toBe(perfect.total);

        // 한 글자만 입력: 부분 정타
        const partial = countCorrectJamo("\uD55C\uAE00", "\uD55C");
        expect(partial.correct).toBeGreaterThan(0);
        expect(partial.correct).toBeLessThan(partial.total);

        // 한 자모만 다른 경우: 거의 다 맞음
        // "한글"(ㅎㅏㄴㄱㅡㄹ) vs "한긇"(ㅎㅏㄴㄱㅡㅎ) → 5/6 정타
        const oneOff = countCorrectJamo("\uD55C\uAE00", "\uD55C\uAE07");
        expect(oneOff.correct).toBe(5);
        expect(oneOff.total).toBe(6);
    });

    it("counts correct jamo for English text", () => {
        const result = countCorrectJamo("hello", "helo");
        expect(result.correct).toBeGreaterThan(0);
        expect(result.total).toBe(5);
    });
});
