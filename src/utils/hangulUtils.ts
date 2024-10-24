// hangulUtils.ts
import { getLevenshteinDistance } from "./levenshtein";

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

export const compareHangulJamo = (
    target: string,
    input: string
): ('correct' | 'incorrect' | 'pending')[] => {
    const targetJamo = target.split('').flatMap(decomposeHangul);
    const inputJamo = input.split('').flatMap(decomposeHangul);

    return targetJamo.map((jamo, index) => {
        if (index >= inputJamo.length) return 'pending';
        return inputJamo[index] === jamo ? 'correct' : 'incorrect';
    });
};

export const calculateHangulAccuracy = (target: string, input: string): number => {
    // 입력이 없는 경우 0% 반환
    if (!input) return 0;

    const targetJamo = target.split("").flatMap(decomposeHangul);
    const inputJamo = input.split("").flatMap(decomposeHangul);
    
    // 목표 텍스트의 자모 개수를 기준으로 함
    const totalJamo = targetJamo.length;
    
    // 레벤슈타인 거리 계산
    const distance = getLevenshteinDistance(
        targetJamo, 
        // 입력된 자모가 목표보다 길 경우를 대비해 목표 길이만큼만 사용
        inputJamo.slice(0, totalJamo)
    );

    // 정확도 계산: (전체 자모 수 - 편집 거리) / 전체 자모 수 * 100
    const accuracy = ((totalJamo - distance) / totalJamo) * 100;
    
    // 0~100 사이의 값으로 제한하고 반올림
    return Math.min(100, Math.max(0, Math.round(accuracy)));
};