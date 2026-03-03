import proverbsData from "../data/proverbs.json";

const BASIC_PUNCTUATION = ".,!?\"'():;-";
const MAX_PROMPT_LENGTH: Record<"korean" | "english", number> = {
    korean: 90,
    english: 140,
};

const escapeForCharClass = (text: string): string =>
    text.replace(/[\\\-\]^]/g, "\\$&");

const trimToLength = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    const sliced = text.slice(0, maxLength).trim();
    const lastSpace = sliced.lastIndexOf(" ");
    if (lastSpace < maxLength * 0.6) return sliced;
    return sliced.slice(0, lastSpace).trim();
};

export function sanitizePracticeSentence(
    text: string,
    language: "korean" | "english",
): string {
    const escaped = escapeForCharClass(BASIC_PUNCTUATION);
    const allowed =
        language === "korean"
            ? new RegExp(`[^가-힣0-9\\s${escaped}]`, "g")
            : new RegExp(`[^A-Za-z0-9\\s${escaped}]`, "g");

    return text
        .replace(allowed, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizePracticePrompt(
    text: string,
    language: "korean" | "english",
): string {
    const noMarkup = text
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/\([^)]*\)/g, " ");
    const sanitized = sanitizePracticeSentence(noMarkup, language);
    if (!sanitized) return "";
    return trimToLength(sanitized, MAX_PROMPT_LENGTH[language]);
}

/** 단순 랜덤 문장 반환 (TypingDefenseGame, TypingInput용) */
export function getRandomSentence(language: "korean" | "english"): string {
    const sentences = proverbsData[language];
    return normalizePracticePrompt(
        sentences[Math.floor(Math.random() * sentences.length)],
        language
    );
}

/** 중복 방지 랜덤 문장 반환 (TypingRaceGame, DictationGame용) */
export function getRandomSentenceUnique(
    language: "korean" | "english",
    usedIndices: Set<number>,
): string {
    const sentences = proverbsData[language];
    const available = sentences.filter((_, i) => !usedIndices.has(i));
    const pool = available.length > 0 ? available : sentences;
    const idx = sentences.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    usedIndices.add(idx);
    return normalizePracticePrompt(sentences[idx], language);
}
