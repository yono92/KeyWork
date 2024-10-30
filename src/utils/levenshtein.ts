export const getLevenshteinDistance = (a: string[], b: string[]): number => {
    const matrix = Array(a.length + 1)
        .fill(null)
        .map(() => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) {
        matrix[i][0] = i;
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // 삽입
                matrix[i][j - 1] + 1, // 삭제
                matrix[i - 1][j - 1] + cost // 교체
            );
        }
    }

    return matrix[a.length][b.length];
};
