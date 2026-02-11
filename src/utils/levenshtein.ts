export const getLevenshteinDistance = (a: string[], b: string[]): number => {
    // 빈 배열 처리
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // 짧은 배열을 열(column)로 사용하여 공간 최적화
    const [short, long] = a.length < b.length ? [a, b] : [b, a];

    let prev = Array.from({ length: short.length + 1 }, (_, i) => i);
    let curr = new Array(short.length + 1);

    for (let i = 1; i <= long.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= short.length; j++) {
            const cost = long[i - 1] === short[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,      // 삽입
                curr[j - 1] + 1,  // 삭제
                prev[j - 1] + cost // 교체
            );
        }
        [prev, curr] = [curr, prev];
    }

    return prev[short.length];
};
