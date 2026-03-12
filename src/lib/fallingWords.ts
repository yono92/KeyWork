export type FallingWordStatus = "falling" | "matched" | "missed";

export interface MatchableFallingWord {
    id: number;
    text: string;
    status: FallingWordStatus;
}

export function findClaimableFallingWord<T extends MatchableFallingWord>(
    words: readonly T[],
    value: string,
    claimedWordIds: ReadonlySet<number>,
): T | null {
    const matchedWord = words.find(
        (word) => value === word.text && word.status === "falling",
    );

    if (!matchedWord || claimedWordIds.has(matchedWord.id)) {
        return null;
    }

    return matchedWord;
}

export function calculateFallingWordsMatchScore(
    currentCombo: number,
    wordLength: number,
    timeSinceLastType: number,
) {
    const nextCombo = currentCombo + 1;
    const comboMultiplier = Math.min(1 + nextCombo * 0.2, 2);
    const rapidBonusMultiplier = timeSinceLastType < 500 ? 1.5 : 1;
    const finalScore = Math.round(wordLength * 10 * comboMultiplier * rapidBonusMultiplier);

    return {
        nextCombo,
        comboMultiplier,
        finalScore,
        triggeredComboMilestone: nextCombo >= 5 && nextCombo % 5 === 0,
        triggeredComboSound: nextCombo >= 5,
    };
}
