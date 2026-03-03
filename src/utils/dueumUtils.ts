/**
 * 두음법칙 관련 순수 유틸리티 함수
 * WordChainGame에서 추출 — React 무관
 */

/** 두음법칙 적용: 한글 음절의 초성을 변환한 음절을 반환 */
export const applyDueum = (char: string): string | null => {
    const code = char.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return null;
    const offset = code - 0xAC00;
    const initial = Math.floor(offset / (21 * 28));
    const medial = Math.floor((offset % (21 * 28)) / 28);
    const final_ = offset % 28;

    // ㅑ(2),ㅕ(6),ㅖ(7),ㅛ(12),ㅠ(17),ㅣ(20) 앞에서 ㄹ→ㅇ, ㄴ→ㅇ
    const yVowels = [2, 6, 7, 12, 17, 20];
    // ㅏ(0),ㅐ(1),ㅗ(8),ㅚ(11),ㅜ(13),ㅡ(18) 앞에서 ㄹ→ㄴ
    const aVowels = [0, 1, 8, 11, 13, 18];

    let newInitial: number | null = null;
    if (initial === 5) { // ㄹ
        if (aVowels.includes(medial)) newInitial = 2;  // ㄹ→ㄴ (라→나, 로→노 등)
        else if (yVowels.includes(medial)) newInitial = 11; // ㄹ→ㅇ (리→이, 려→여 등)
    } else if (initial === 2) { // ㄴ
        if (yVowels.includes(medial)) newInitial = 11; // ㄴ→ㅇ (니→이, 녀→여 등)
    }
    if (newInitial === null) return null;
    return String.fromCharCode(0xAC00 + newInitial * 21 * 28 + medial * 28 + final_);
};

/** 끝 글자에서 다음 단어의 가능한 시작 글자 목록 반환 (두음법칙 정방향 + 역방향) */
export const getStartChars = (lastChar: string): string[] => {
    const chars = [lastChar];
    const code = lastChar.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return chars;

    // 정방향: 두음법칙 적용 (련→연, 님→임, 략→약 등)
    const transformed = applyDueum(lastChar);
    if (transformed) chars.push(transformed);

    // 역방향: 두음법칙 역적용 (여→려/녀, 이→리/니, 노→로 등)
    const offset = code - 0xAC00;
    const initial = Math.floor(offset / (21 * 28));
    const medial = Math.floor((offset % (21 * 28)) / 28);
    const final_ = offset % 28;
    const yVowels = [2, 6, 7, 12, 17, 20];
    const aVowels = [0, 1, 8, 11, 13, 18];
    const buildChar = (i: number) => String.fromCharCode(0xAC00 + i * 21 * 28 + medial * 28 + final_);

    if (initial === 2 && aVowels.includes(medial)) {
        // ㄴ+ㅏ/ㅐ/ㅗ/ㅚ/ㅜ/ㅡ ← ㄹ (나→라, 노→로 등)
        chars.push(buildChar(5));
    } else if (initial === 11 && yVowels.includes(medial)) {
        // ㅇ+ㅑ/ㅕ/ㅖ/ㅛ/ㅠ/ㅣ ← ㄹ, ㄴ (여→려/녀, 이→리/니 등)
        chars.push(buildChar(5), buildChar(2));
    }

    return [...new Set(chars)];
};

/** 단어의 마지막 글자 */
export const getLastChar = (word: string): string => word[word.length - 1];

/** 단어의 첫 글자 */
export const getFirstChar = (word: string): string => word[0];

/** 끝말잇기 연결 유효성 검사 */
export const isChainValid = (lastChar: string, nextWord: string): boolean => {
    const validStarts = getStartChars(lastChar);
    const firstChar = getFirstChar(nextWord);
    return validStarts.includes(firstChar);
};

/** 한방 단어 방어: 이을 수 없는 끝 글자 목록 */
export const KILLER_ENDINGS = new Set([
    "늄", "슘", "튬", "륨", "듐", "뮴", "붕",
    "숍", "릅", "갈", "꿈", "늑", "릇", "맡",
]);

/** 초반 6턴(플레이어 3번 + AI 3번) 동안 한방 단어 차단 */
export const isKillerWord = (word: string, usedWordsCount: number): boolean => {
    if (usedWordsCount >= 6) return false;
    const last = getLastChar(word);
    // 두음법칙 적용한 모든 변환도 체크
    const chars = getStartChars(last);
    return chars.every((c) => KILLER_ENDINGS.has(c));
};
