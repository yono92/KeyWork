import { useState, useCallback, useEffect } from "react";
import { KOREAN_START_POOL, HANGUL_WORD_REGEX } from "../utils/koreanConstants";
import wordsData from "../data/word.json";

/**
 * 한국어 단어 fetch + 랜덤 선택 훅
 * FallingWordsGame, TypingDefenseGame 공유
 */
export function useKoreanWords(language: "korean" | "english") {
    const [koreanWords, setKoreanWords] = useState<string[]>([]);

    const fetchKoreanWords = useCallback(async () => {
        if (language !== "korean") return;
        try {
            const starts = encodeURIComponent(KOREAN_START_POOL.join(","));
            const response = await fetch(`/api/krdict/candidates?starts=${starts}&num=220`);
            if (!response.ok) return;

            const data: unknown = await response.json();
            if (
                typeof data === "object" &&
                data !== null &&
                "words" in data &&
                Array.isArray((data as { words: unknown }).words)
            ) {
                const words = ((data as { words: string[] }).words ?? [])
                    .map((w) => w.trim())
                    .filter((w) => HANGUL_WORD_REGEX.test(w));
                if (words.length > 0) {
                    setKoreanWords([...new Set(words)]);
                }
            }
        } catch {
            // ignore
        }
    }, [language]);

    useEffect(() => {
        if (language === "korean") {
            void fetchKoreanWords();
        }
    }, [language, fetchKoreanWords]);

    const getRandomWord = useCallback((): string => {
        if (language === "korean") {
            if (koreanWords.length === 0) {
                void fetchKoreanWords();
                return "";
            }
            if (koreanWords.length < 50) {
                void fetchKoreanWords();
            }
            return koreanWords[Math.floor(Math.random() * koreanWords.length)];
        }

        const wordsList = wordsData[language];
        if (!Array.isArray(wordsList) || wordsList.length === 0) {
            return "";
        }
        return wordsList[Math.floor(Math.random() * wordsList.length)];
    }, [language, koreanWords, fetchKoreanWords]);

    return { koreanWords, fetchKoreanWords, getRandomWord };
}
