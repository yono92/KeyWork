import proverbsData from "../data/proverbs.json";

/** 단순 랜덤 문장 반환 (TypingDefenseGame, TypingInput용) */
export function getRandomSentence(language: "korean" | "english"): string {
    const sentences = proverbsData[language];
    return sentences[Math.floor(Math.random() * sentences.length)];
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
    return sentences[idx];
}
