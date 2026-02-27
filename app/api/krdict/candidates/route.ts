import { NextRequest, NextResponse } from "next/server";
import {
    ApiRequestError,
    fetchWithTimeoutRetry,
    jsonError,
    pruneCache,
} from "@/lib/apiReliability";

const KRDICT_SEARCH_URL = "https://krdict.korean.go.kr/api/search";
const CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_RETURN = 30;
const MAX_RETURN = 300;
const MAX_FETCH_PER_START = 1;
const FETCH_TIMEOUT_MS = 2500;
const FETCH_RETRIES = 1;
const MAX_CACHE_ENTRIES = 200;

type CacheEntry = {
    words: string[];
    expiresAt: number;
};

const candidatesCache = new Map<string, CacheEntry>();

const normalizeHeadword = (word: string): string =>
    word
        .trim()
        .replace(/\s+/g, "")
        .replace(/[-^]/g, "")
        .replace(/\d+$/g, "");

const isHangulWord = (word: string): boolean => /^[\uAC00-\uD7A3]{2,}$/.test(word);
const isHangulChar = (char: string): boolean => /^[\uAC00-\uD7A3]$/.test(char);

const extractWordsFromXml = (xml: string): string[] => {
    const matches = xml.match(/<word>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/word>/g) ?? [];
    return matches
        .map((entry) =>
            entry
                .replace(/<word>/g, "")
                .replace(/<\/word>/g, "")
                .replace(/<!\[CDATA\[/g, "")
                .replace(/\]\]>/g, "")
                .trim()
        )
        .map(normalizeHeadword)
        .filter((word) => isHangulWord(word));
};

const fetchCandidatesByStart = async (apiKey: string, start: string): Promise<string[]> => {
    const merged: string[] = [];

    for (let page = 1; page <= MAX_FETCH_PER_START; page++) {
        const searchParams = new URLSearchParams({
            key: apiKey,
            q: start,
            req_type: "xml",
            part: "word",
            method: "start",
            num: "100",
            start: String((page - 1) * 100 + 1),
            advanced: "y",
            pos: "1",
        });

        const response = await fetchWithTimeoutRetry(
            `${KRDICT_SEARCH_URL}?${searchParams.toString()}`,
            { cache: "no-store" },
            { timeoutMs: FETCH_TIMEOUT_MS, retries: FETCH_RETRIES }
        );

        const xml = await response.text();
        const words = extractWordsFromXml(xml).filter((w) => w.startsWith(start));
        if (words.length === 0) break;

        merged.push(...words);
        if (merged.length >= MAX_RETURN * 3) break;
    }

    return [...new Set(merged)];
};

export async function GET(request: NextRequest) {
    const startsRaw = request.nextUrl.searchParams.get("starts") ?? "";
    const starts = startsRaw
        .split(",")
        .map((s) => normalizeHeadword(s))
        .filter((s) => isHangulChar(s));

    if (starts.length === 0) {
        return jsonError("starts query is required", "BAD_REQUEST", 400, "krdict");
    }

    const numRaw = request.nextUrl.searchParams.get("num");
    const parsedNum = numRaw ? Number(numRaw) : DEFAULT_RETURN;
    const limit =
        Number.isFinite(parsedNum) && parsedNum > 0
            ? Math.min(Math.floor(parsedNum), MAX_RETURN)
            : DEFAULT_RETURN;

    const apiKey = process.env.KRDICT_API_KEY;
    if (!apiKey) {
        return jsonError(
            "KRDICT_API_KEY is not configured",
            "CONFIG_MISSING",
            503,
            "krdict"
        );
    }

    const cacheKey = `${starts.join(",")}:${limit}`;
    const cached = candidatesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({ words: cached.words, source: "krdict-cache" });
    }

    try {
        // 병렬로 모든 시작 글자를 동시에 fetch
        const results = await Promise.allSettled(
            starts.map((start) => fetchCandidatesByStart(apiKey, start))
        );
        const allWords: string[] = [];
        for (const result of results) {
            if (result.status === "fulfilled") {
                allWords.push(...result.value);
            }
        }

        const deduped = [...new Set(allWords)].slice(0, limit);
        pruneCache(candidatesCache, MAX_CACHE_ENTRIES);
        candidatesCache.set(cacheKey, {
            words: deduped,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return NextResponse.json(
            { words: deduped, source: "krdict" },
            { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=300" } }
        );
    } catch (error) {
        if (error instanceof ApiRequestError) {
            return jsonError(error.message, error.code, error.status, "krdict");
        }
        return jsonError("krdict request failed", "NETWORK", 502, "krdict");
    }
}
