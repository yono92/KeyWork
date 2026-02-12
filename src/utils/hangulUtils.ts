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

// 한글 문자열의 실제 키 입력 횟수를 계산하는 함수 (개선된 버전)
export const countKeystrokes = (text: string): number => {
    let keystrokes = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (isHangul(char)) {
            // 실제 입력 횟수에 가깝게 자모 개수 기준으로 계산
            keystrokes += decomposeHangul(char).length;
        } else {
            // 영문, 숫자, 공백, 특수문자 등은 1회 입력으로 계산
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
