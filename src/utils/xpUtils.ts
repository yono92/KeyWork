// 레벨 N→N+1에 N×100 XP 필요
// Lv1→2: 100, Lv2→3: 200, Lv3→4: 300 ...
// 레벨 N까지 누적 XP: sum(1..N-1) * 100 = N*(N-1)/2 * 100

export function getLevel(totalXp: number): number {
    // N*(N-1)/2 * 100 <= totalXp 인 최대 N 구하기
    // N^2 - N - 2*totalXp/100 <= 0
    // N <= (1 + sqrt(1 + 8*totalXp/100)) / 2
    if (totalXp <= 0) return 1;
    const n = Math.floor((1 + Math.sqrt(1 + (8 * totalXp) / 100)) / 2);
    return Math.max(1, n);
}

export function getXpProgress(totalXp: number): {
    current: number;
    needed: number;
    percent: number;
} {
    const level = getLevel(totalXp);
    const xpForCurrentLevel = ((level * (level - 1)) / 2) * 100;
    const current = totalXp - xpForCurrentLevel;
    const needed = level * 100;
    const percent = Math.min(100, Math.round((current / needed) * 100));
    return { current, needed, percent };
}

const DIFFICULTY_MULTIPLIER: Record<string, number> = {
    easy: 1,
    normal: 1.5,
    hard: 2,
};

export function calculateGameXp(
    rawXp: number,
    difficulty: string = "normal"
): number {
    const mul = DIFFICULTY_MULTIPLIER[difficulty] ?? 1.5;
    return Math.round(Math.max(0, rawXp) * mul);
}
