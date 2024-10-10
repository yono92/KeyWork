export const decomposeHangul = (char: string): string[] => {
    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return [char];
    const jong = code % 28;
    const jung = ((code - jong) / 28) % 21;
    const cho = ((code - jong) / 28 - jung) / 21;
    return [
        String.fromCharCode(0x1100 + cho),
        String.fromCharCode(0x1161 + jung),
        jong ? String.fromCharCode(0x11A7 + jong) : '',
    ].filter(Boolean);
};

export const isHangul = (char: string): boolean => {
    const code = char.charCodeAt(0);
    return code >= 0xAC00 && code <= 0xD7A3;
};

// 자모 비교 함수
export const compareHangulJamo = (target: string, input: string): ('correct' | 'incorrect' | 'pending')[] => {
    const targetJamo = decomposeHangul(target);
    const inputJamo = decomposeHangul(input);

    return targetJamo.map((jamo, index) => {
        if (index >= inputJamo.length) return 'pending'; // 아직 입력되지 않은 경우
        return inputJamo[index] === jamo ? 'correct' : 'incorrect'; // 자모 비교
    });
};

export const decomposeHangulString = (str: string): string => {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        result += decomposeHangul(str[i]).join('');
    }
    return result;
};