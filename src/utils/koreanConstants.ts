/** 한국어 초성 풀 (FallingWordsGame, TypingDefenseGame, WordChainGame 공유) */
export const KOREAN_START_POOL = [
    "가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하",
];

/** 한글 단어 정규식: 완성형 한글 2글자 이상 */
export const HANGUL_WORD_REGEX = /^[\uAC00-\uD7A3]{2,}$/;
