import { extractPracticePrompts, normalizePracticePrompt, sanitizePracticeSentence } from "../../src/utils/sentenceUtils";

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

describe("normalizePracticePrompt", () => {
    it("removes bracket and parenthesis chunks", () => {
        const result = normalizePracticePrompt("테스트[12] 문장 (부가설명) 입니다!", "korean");
        expect(result).toBe("테스트 문장 입니다!");
    });

    it("trims very long korean text", () => {
        const longText = "가".repeat(300);
        const result = normalizePracticePrompt(longText, "korean");
        expect(result.length).toBeLessThanOrEqual(90);
    });
});

describe("extractPracticePrompts", () => {
    it("splits long text into multiple prompts by sentence boundaries", () => {
        const long = "첫 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.";
        const prompts = extractPracticePrompts(long.repeat(5), "korean");
        expect(prompts.length).toBeGreaterThan(1);
        expect(prompts.every((p) => p.length <= 90)).toBe(true);
    });

    it("removes bracket metadata before splitting", () => {
        const prompts = extractPracticePrompts("테스트[1] 문장입니다. 다음(부가 설명) 문장입니다.", "korean");
        expect(prompts.join(" ")).not.toContain("[1]");
        expect(prompts.join(" ")).not.toContain("부가 설명");
    });
});
