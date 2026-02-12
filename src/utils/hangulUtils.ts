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
            // 한글 문자는 자모 분해하여 실제 키 입력 횟수 계산
            const jamos = decomposeHangul(char);

            // 한글 자모 입력에 가중치 부여 (실제 키보드 입력 패턴 반영)
            // 초성, 중성, 종성 각각에 대해 다른 가중치 적용
            jamos.forEach((_, index) => {
                // 초성(0), 중성(1), 종성(2)에 따라 다른 가중치 적용
                if (index === 0) {
                    // 초성 가중치
                    keystrokes += 1.2;
                } else if (index === 1) {
                    // 중성 가중치 (모음은 보통 2개 이상의 키 입력이 필요한 경우가 많음)
                    keystrokes += 1.5;
                } else {
                    // 종성 가중치
                    keystrokes += 1.3;
                }
            });

            // 추가 보정: 한글 입력은 영문보다 복잡하므로 추가 가중치
            keystrokes += 0.5;
        } else if (char === " ") {
            // 공백은 1회 키 입력
            keystrokes += 1;
        } else {
            // 영문, 숫자, 특수문자 등은 1회 키 입력으로 계산
            keystrokes += 1;
        }
    }

    return Math.round(keystrokes);
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
