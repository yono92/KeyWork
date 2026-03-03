import { sanitizePracticeSentence } from "../../src/utils/sentenceUtils";

describe("sanitizePracticeSentence", () => {
    it("keeps hangul, spaces, digits and basic punctuation in korean mode", () => {
        const result = sanitizePracticeSentence("한글 ABC 123! @# 테스트🙂", "korean");
        expect(result).toBe("한글 123! 테스트");
    });

    it("removes non-english characters in english mode", () => {
        const result = sanitizePracticeSentence("Hello 한글 42, world! 😀", "english");
        expect(result).toBe("Hello 42, world!");
    });

    it("normalizes repeated spaces", () => {
        const result = sanitizePracticeSentence("Hello   world   !", "english");
        expect(result).toBe("Hello world !");
    });
});
