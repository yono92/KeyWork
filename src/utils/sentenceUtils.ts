import proverbsData from "../data/proverbs.json";

const BASIC_PUNCTUATION = ".,!?\"'():;-";
const MAX_PROMPT_LENGTH: Record<"korean" | "english", number> = {
    korean: 90,
    english: 140,
};
const MIN_PROMPT_LENGTH: Record<"korean" | "english", number> = {
    korean: 24,
    english: 36,
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

const splitByWords = (text: string, maxLength: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let current = "";

    for (const word of words) {
        if (word.length > maxLength) {
            if (current) {
                chunks.push(current);
                current = "";
            }
            for (let i = 0; i < word.length; i += maxLength) {
                chunks.push(word.slice(i, i + maxLength));
            }
            continue;
        }

        if (!current) {
            current = word;
            continue;
        }
        if (current.length + 1 + word.length <= maxLength) {
            current = `${current} ${word}`;
            continue;
        }
        chunks.push(current);
        current = word;
    }
    if (current) chunks.push(current);
    return chunks;
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
    const prompts = extractPracticePrompts(text, language);
    return prompts[0] ?? "";
}

export function extractPracticePrompts(
    text: string,
    language: "korean" | "english",
): string[] {
    const noMarkup = text
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/\([^)]*\)/g, " ");
    const sanitized = sanitizePracticeSentence(noMarkup, language);
    if (!sanitized) return [];

    const maxLength = MAX_PROMPT_LENGTH[language];
    if (sanitized.length <= maxLength) return [sanitized];

    const sentences = sanitized.split(/(?<=[.!?])\s+/).filter(Boolean);
    const source = sentences.length > 1 ? sentences : splitByWords(sanitized, maxLength);
    const prompts: string[] = [];
    let current = "";

    for (const segment of source) {
        const part = segment.trim();
        if (!part) continue;

        if (part.length > maxLength) {
            if (current) {
                prompts.push(current);
                current = "";
            }
            prompts.push(...splitByWords(part, maxLength));
            continue;
        }

        if (!current) {
            current = part;
            continue;
        }

        if (current.length + 1 + part.length <= maxLength) {
            current = `${current} ${part}`;
            continue;
        }

        prompts.push(current);
        current = part;
    }

    if (current) prompts.push(current);

    const minLength = MIN_PROMPT_LENGTH[language];
    const filtered = prompts
        .map((prompt) => prompt.trim())
        .filter((prompt) => prompt.length > 0)
        .filter((prompt, index, arr) => prompt.length >= minLength || arr.length === 1 || index === arr.length - 1);

    if (filtered.length === 0) {
        return [trimToLength(sanitized, maxLength)];
    }
    return filtered;
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
