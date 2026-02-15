import { getLevenshteinDistance } from "./levenshtein";

describe("getLevenshteinDistance", () => {
    it("returns 0 for equal arrays", () => {
        expect(getLevenshteinDistance(["a", "b"], ["a", "b"])).toBe(0);
    });

    it("handles insertion/deletion/replacement", () => {
        expect(getLevenshteinDistance(["a"], ["a", "b"])).toBe(1);
        expect(getLevenshteinDistance(["a", "b"], ["a"])).toBe(1);
        expect(getLevenshteinDistance(["a", "b"], ["a", "c"])).toBe(1);
    });

    it("handles empty arrays", () => {
        expect(getLevenshteinDistance([], ["a", "b"])).toBe(2);
        expect(getLevenshteinDistance(["a", "b"], [])).toBe(2);
    });
});
