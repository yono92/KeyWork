import { useState, useCallback, useEffect, useRef } from "react";
import { pickRandomStarts, HANGUL_WORD_REGEX } from "../utils/koreanConstants";
import wordsData from "../data/word.json";

export interface UseKoreanWordsOptions {
    /** 초기 요청 시 시작 글자 개수 (기본 15) */
    startCount?: number;
    /** wordSource/fallbackMessage 상태 추적 여부 (기본 false) */
    trackFallback?: boolean;
    /** 단어 필터 함수 (예: 길이 제한) */
    wordFilter?: (word: string) => boolean;
}

/**
 * 한국어 단어 fetch + 랜덤 선택 훅
 * FallingWordsGame, TypingDefenseGame, TypingRunnerGame 공유
 */
export function useKoreanWords(
    language: "korean" | "english",
    options: UseKoreanWordsOptions = {},
) {
    const { startCount = 15, trackFallback = false, wordFilter } = options;

    const [koreanWords, setKoreanWords] = useState<string[]>([]);
    const recentWordsRef = useRef<string[]>([]);

    // trackFallback 모드용 상태 (trackFallback=false일 때도 할당은 하되 무시)
    const [wordSource, setWordSource] = useState<"krdict" | "local">("local");
    const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

    const fetchKoreanWords = useCallback(async () => {
        if (language !== "korean") return;
        try {
            const starts = encodeURIComponent(pickRandomStarts(startCount).join(","));
            const response = await fetch(`/api/krdict/candidates?starts=${starts}&num=300`);
            if (!response.ok) {
                if (trackFallback) {
                    setWordSource("local");
                    setFallbackMessage("사전 연결이 불안정해 로컬 단어로 진행 중입니다.");
                }
                return;
            }

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
                    if (trackFallback) {
                        setWordSource("krdict");
                        setFallbackMessage(null);
                    }
                    return;
                }
            }
            if (trackFallback) {
                setWordSource("local");
                setFallbackMessage("사전 응답이 비어 로컬 단어로 진행 중입니다.");
            }
        } catch {
            if (trackFallback) {
                setWordSource("local");
                setFallbackMessage("사전 연결 실패로 로컬 단어로 진행 중입니다.");
            }
        }
    }, [language, startCount, trackFallback]);

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
            const pool = koreanWords.length > 0 ? koreanWords : wordsData.korean;
            if (koreanWords.length === 0) {
                void fetchKoreanWords();
            }
            if (koreanWords.length > 0 && koreanWords.length < 50) {
                void fetchKoreanWords();
            }
            let source = pool;
            if (wordFilter) {
                const filtered = pool.filter(wordFilter);
                source = filtered.length > 0 ? filtered : pool;
            }
            const diversePool = source.filter((w) => !isTooSimilarWord(w, "korean"));
            const finalPool = diversePool.length > 0 ? diversePool : source;
            const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
            recentWordsRef.current = [...recentWordsRef.current.slice(-3), picked];
            return picked || "";
        }

        const wordsList = wordsData[language];
        if (!Array.isArray(wordsList) || wordsList.length === 0) {
            return "";
        }
        let source = wordsList;
        if (wordFilter) {
            const filtered = wordsList.filter(wordFilter);
            source = filtered.length > 0 ? filtered : wordsList;
        }
        const diversePool = source.filter((w) => !isTooSimilarWord(w, "english"));
        const finalPool = diversePool.length > 0 ? diversePool : source;
        const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
        recentWordsRef.current = [...recentWordsRef.current.slice(-3), picked];
        return picked || "";
    }, [language, koreanWords, fetchKoreanWords, isTooSimilarWord, wordFilter]);

    return {
        koreanWords,
        fetchKoreanWords,
        getRandomWord,
        // trackFallback 모드에서만 의미 있는 값들
        wordSource,
        fallbackMessage,
        setFallbackMessage,
    };
}
