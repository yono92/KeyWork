import { useState, useCallback, useEffect, useRef } from "react";
import { pickRandomStarts, HANGUL_WORD_REGEX } from "../utils/koreanConstants";
import wordsData from "../data/word.json";
import { fetchWithClientTimeout } from "../lib/clientFetch";
import { isTooSimilarWord, pickDiverseWord } from "../utils/wordDiversity";

const RECENT_WORD_WINDOW = 8;

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
    const usedWordsRef = useRef<Set<string>>(new Set());
    const recentWordsRef = useRef<string[]>([]);

    // trackFallback 모드용 상태 (trackFallback=false일 때도 할당은 하되 무시)
    const [wordSource, setWordSource] = useState<"krdict" | "local">("local");
    const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

    const fetchKoreanWords = useCallback(async () => {
        if (language !== "korean") return;
        try {
            const starts = encodeURIComponent(pickRandomStarts(startCount).join(","));
            const response = await fetchWithClientTimeout(
                `/api/krdict/candidates?starts=${starts}&num=300`
            );
            if (!response.ok) {
                if (trackFallback) {
                    setWordSource("local");
                    setFallbackMessage("기본 단어장으로 진행합니다.");
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
                setFallbackMessage("기본 단어장으로 진행합니다.");
            }
        } catch {
            if (trackFallback) {
                setWordSource("local");
                setFallbackMessage("기본 단어장으로 진행합니다.");
            }
        }
    }, [language, startCount, trackFallback]);

    useEffect(() => {
        if (language === "korean") {
            void fetchKoreanWords();
        }
    }, [language, fetchKoreanWords]);

    useEffect(() => {
        usedWordsRef.current.clear();
        recentWordsRef.current = [];
    }, [language]);

    const pickFromPool = useCallback((source: string[], lang: "korean" | "english"): string => {
        // 1차: 사용 안 한 단어 중에서 유사도도 낮은 것
        const unused = source.filter((w) => !usedWordsRef.current.has(w));
        const base = unused.length > 0 ? unused : source;

        // 풀의 80% 이상 소진 시 리셋 (무한 반복 방지)
        if (unused.length <= source.length * 0.2) {
            usedWordsRef.current.clear();
            recentWordsRef.current = [];
        }

        const recent = recentWordsRef.current;
        const diverse = base.filter((w) => !isTooSimilarWord(w, recent, lang));
        const finalPool = diverse.length > 0 ? diverse : base;
        const picked = pickDiverseWord(finalPool, recent, lang);

        usedWordsRef.current.add(picked);
        recentWordsRef.current = [...recentWordsRef.current.slice(-(RECENT_WORD_WINDOW - 1)), picked];
        return picked || "";
    }, []);

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
            return pickFromPool(source, "korean");
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
        return pickFromPool(source, "english");
    }, [language, koreanWords, fetchKoreanWords, pickFromPool, wordFilter]);

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
