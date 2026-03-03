import { useState, useCallback, useEffect, useRef } from "react";
import { KOREAN_START_POOL, HANGUL_WORD_REGEX } from "../utils/koreanConstants";
import wordsData from "../data/word.json";

/**
 * 한국어 단어 fetch + 랜덤 선택 훅
 * FallingWordsGame, TypingDefenseGame 공유
 */
export function useKoreanWords(language: "korean" | "english") {
    const [koreanWords, setKoreanWords] = useState<string[]>([]);
    const recentWordsRef = useRef<string[]>([]);

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

    useEffect(() => {
        recentWordsRef.current = [];
    }, [language]);

    const getSharedPrefixLength = useCallback((a: string, b: string): number => {
        const max = Math.min(a.length, b.length);
        let i = 0;
        while (i < max && a[i] === b[i]) i += 1;
        return i;
    }, []);

    const isTooSimilarWord = useCallback(
        (candidate: string, languageKey: "korean" | "english"): boolean => {
            const recent = recentWordsRef.current;
            for (let i = recent.length - 1; i >= 0; i -= 1) {
                const prev = recent[i];
                if (candidate === prev) return true;
                const sharedPrefix = getSharedPrefixLength(candidate, prev);
                const isImmediatePrevious = i === recent.length - 1;

                if (languageKey === "korean") {
                    if (sharedPrefix >= 2) return true;
                    if (isImmediatePrevious && sharedPrefix >= 1) return true;
                    continue;
                }

                if (sharedPrefix >= 3) return true;
            }
            return false;
        },
        [getSharedPrefixLength]
    );

    const getRandomWord = useCallback((): string => {
        if (language === "korean") {
            if (koreanWords.length === 0) {
                void fetchKoreanWords();
                return "";
            }
            if (koreanWords.length < 50) {
                void fetchKoreanWords();
            }
            const diversePool = koreanWords.filter((w) => !isTooSimilarWord(w, "korean"));
            const finalPool = diversePool.length > 0 ? diversePool : koreanWords;
            const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
            recentWordsRef.current = [...recentWordsRef.current.slice(-3), picked];
            return picked;
        }

        const wordsList = wordsData[language];
        if (!Array.isArray(wordsList) || wordsList.length === 0) {
            return "";
        }
        const diversePool = wordsList.filter((w) => !isTooSimilarWord(w, "english"));
        const finalPool = diversePool.length > 0 ? diversePool : wordsList;
        const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
        recentWordsRef.current = [...recentWordsRef.current.slice(-3), picked];
        return picked;
    }, [language, koreanWords, fetchKoreanWords, isTooSimilarWord]);

    return { koreanWords, fetchKoreanWords, getRandomWord };
}
