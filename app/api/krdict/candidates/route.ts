import { NextRequest, NextResponse } from "next/server";

const KRDICT_SEARCH_URL = "https://krdict.korean.go.kr/api/search";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_RETURN = 30;
const MAX_FETCH_PER_START = 3;

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

const isHangulWord = (word: string): boolean => /^[가-힣]{2,}$/.test(word);

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
            method: "include",
            num: "100",
            start: String((page - 1) * 100 + 1),
        });

        const response = await fetch(`${KRDICT_SEARCH_URL}?${searchParams.toString()}`, {
            cache: "no-store",
        });
        if (!response.ok) break;

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
        .filter((s) => /^[가-힣]$/.test(s));

    if (starts.length === 0) {
        return NextResponse.json({ error: "starts query is required" }, { status: 400 });
    }

    const apiKey = process.env.KRDICT_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "KRDICT_API_KEY is not configured" },
            { status: 503 }
        );
    }

    const cacheKey = starts.join(",");
    const cached = candidatesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({ words: cached.words, source: "krdict-cache" });
    }

    try {
        const allWords: string[] = [];
        for (const start of starts) {
            const words = await fetchCandidatesByStart(apiKey, start);
            allWords.push(...words);
        }

        const deduped = [...new Set(allWords)].slice(0, MAX_RETURN);
        candidatesCache.set(cacheKey, {
            words: deduped,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return NextResponse.json({ words: deduped, source: "krdict" });
    } catch {
        return NextResponse.json({ error: "krdict request failed" }, { status: 502 });
    }
}
