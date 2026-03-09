export type WordLanguage = "korean" | "english";
const RECENT_PREFIX_MIN_LENGTH = 2;

function hasAttachedPrefixPattern(candidate: string, previous: string, language: WordLanguage): boolean {
    if (language !== "korean") return false;

    const minLength = Math.min(candidate.length, previous.length);
    if (minLength < RECENT_PREFIX_MIN_LENGTH) return false;

    const candidateStartsWithPrevious =
        candidate.length > previous.length && candidate.startsWith(previous);
    const previousStartsWithCandidate =
        previous.length > candidate.length && previous.startsWith(candidate);

    return candidateStartsWithPrevious || previousStartsWithCandidate;
}

function hasMeaningfulContainment(candidate: string, previous: string, language: WordLanguage): boolean {
    if (language !== "korean") return false;

    const minLength = Math.min(candidate.length, previous.length);
    if (minLength < 3) return false;

    return candidate.includes(previous) || previous.includes(candidate);
}

export function getSharedPrefixLength(a: string, b: string): number {
    const max = Math.min(a.length, b.length);
    let index = 0;

    while (index < max && a[index] === b[index]) {
        index += 1;
    }

    return index;
}

export function isTooSimilarWord(
    candidate: string,
    recentWords: readonly string[],
    language: WordLanguage
): boolean {
    for (let index = recentWords.length - 1; index >= 0; index -= 1) {
        const previous = recentWords[index];
        if (candidate === previous) return true;
        if (hasAttachedPrefixPattern(candidate, previous, language)) return true;
        if (hasMeaningfulContainment(candidate, previous, language)) return true;

        const sharedPrefix = getSharedPrefixLength(candidate, previous);
        const isImmediatePrevious = index === recentWords.length - 1;

        if (language === "korean") {
            if (sharedPrefix >= 2) return true;
            if (isImmediatePrevious && sharedPrefix >= 1) return true;
            continue;
        }

        if (sharedPrefix >= 3) return true;
    }

    return false;
}

function scoreWordDiversity(
    candidate: string,
    recentWords: readonly string[],
    language: WordLanguage
): number {
    let score = 0;

    recentWords.forEach((previous, index) => {
        const distanceFromLatest = recentWords.length - 1 - index;
        const recencyWeight = Math.max(1, 4 - distanceFromLatest);
        const sharedPrefix = getSharedPrefixLength(candidate, previous);

        if (candidate === previous) {
            score -= 100 * recencyWeight;
            return;
        }

        if (hasAttachedPrefixPattern(candidate, previous, language)) {
            score -= 80 * recencyWeight;
        }

        if (hasMeaningfulContainment(candidate, previous, language)) {
            score -= 50 * recencyWeight;
        }

        if (language === "korean") {
            score -= sharedPrefix * 10 * recencyWeight;
            if (distanceFromLatest === 0 && candidate[0] === previous[0]) {
                score -= 12;
            }
        } else {
            score -= sharedPrefix * 8 * recencyWeight;
        }

        score += Math.min(Math.abs(candidate.length - previous.length), 4);
    });

    score += Math.min(new Set(candidate).size, 6);
    return score;
}

export function pickDiverseWord(
    candidates: readonly string[],
    recentWords: readonly string[],
    language: WordLanguage,
    randomValue = Math.random()
): string {
    if (candidates.length === 0) return "";

    const scored = candidates
        .map((word) => ({
            word,
            score: scoreWordDiversity(word, recentWords, language),
        }))
        .sort((left, right) => right.score - left.score);

    const topScore = scored[0]?.score ?? 0;
    const topCandidates = scored
        .filter((entry) => entry.score >= topScore - 4)
        .slice(0, 4);

    const index = Math.min(
        topCandidates.length - 1,
        Math.floor(randomValue * topCandidates.length)
    );

    return topCandidates[index]?.word ?? scored[0].word;
}
