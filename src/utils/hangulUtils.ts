// hangulUtils.ts
import { getLevenshteinDistance } from "./levenshtein";

export const decomposeHangul = (char: string): string[] => {
    const code = char.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return [char];
    const jong = code % 28;
    const jung = ((code - jong) / 28) % 21;
    const cho = ((code - jong) / 28 - jung) / 21;
    return [
        String.fromCharCode(0x1100 + cho),
        String.fromCharCode(0x1161 + jung),
        jong ? String.fromCharCode(0x11a7 + jong) : "",
    ].filter(Boolean);
};

export const isHangul = (char: string): boolean => {
    const code = char.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
};

// 겹받침 종성 인덱스 (두 자음으로 구성되어 실제 2타가 필요한 종성)
// ㄳ(3) ㄵ(5) ㄶ(6) ㄺ(9) ㄻ(10) ㄼ(11) ㄽ(12) ㄾ(13) ㄿ(14) ㅀ(15) ㅄ(18)
const COMPOUND_JONGSEONG = new Set([3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 18]);

// 한글 문자 하나의 실제 키 입력 횟수를 계산 (Net KPM 계산용)
export const countKeystrokes = (text: string): number => {
    let keystrokes = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (isHangul(char)) {
            const code = char.charCodeAt(0) - 0xac00;
            const jong = code % 28;
            keystrokes += 2; // 초성 + 중성
            if (jong > 0) {
                keystrokes += COMPOUND_JONGSEONG.has(jong) ? 2 : 1;
            }
        } else {
            keystrokes += 1;
        }
    }

    return keystrokes;
};

export const compareHangulJamo = (
    target: string,
    input: string
): ("correct" | "incorrect" | "pending")[] => {
    const targetJamo = target.split("").flatMap(decomposeHangul);
    const inputJamo = input.split("").flatMap(decomposeHangul);

    return targetJamo.map((jamo, index) => {
        if (index >= inputJamo.length) return "pending";
        return inputJamo[index] === jamo ? "correct" : "incorrect";
    });
};

/**
 * 자모 단위로 정타수(correct keystrokes)를 계산.
 * Levenshtein 거리를 사용하여 삽입/삭제/치환을 모두 반영.
 * 속도(KPM/WPM)와 정확도가 동일한 기준으로 계산됨.
 */
export const countCorrectJamo = (
    target: string,
    input: string
): { correct: number; total: number } => {
    if (!input || !target) return { correct: 0, total: 0 };

    const targetJamo = target.split("").flatMap(decomposeHangul);
    const inputJamo = input.split("").flatMap(decomposeHangul);

    const distance = getLevenshteinDistance(targetJamo, inputJamo);
    const maxLen = Math.max(targetJamo.length, inputJamo.length);
    const correct = Math.max(0, maxLen - distance);

    return { correct, total: targetJamo.length };
};

export const calculateHangulAccuracy = (
    target: string,
    input: string
): number => {
    // 입력이 없는 경우 0% 반환
    if (!input) return 0;

    const targetJamo = target.split("").flatMap(decomposeHangul);
    const inputJamo = input.split("").flatMap(decomposeHangul);

    // 목표 텍스트의 자모 개수를 기준으로 함
    const totalJamo = targetJamo.length;

    // 레벤슈타인 거리 계산 (초과 입력도 포함하여 전체 비교)
    const distance = getLevenshteinDistance(targetJamo, inputJamo);

    // 정확도 계산: 비교 기준은 target과 input 중 긴 쪽
    const maxLen = Math.max(totalJamo, inputJamo.length);
    if (maxLen === 0) return 100;
    const accuracy = ((maxLen - distance) / maxLen) * 100;

    // 0~100 사이의 값으로 제한하고 반올림
    return Math.min(100, Math.max(0, Math.round(accuracy)));
};
