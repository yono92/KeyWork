import { NextRequest, NextResponse } from "next/server";

const KRDICT_SEARCH_URL = "https://krdict.korean.go.kr/api/search";
const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
    exists: boolean;
    definition: string | null;
    expiresAt: number;
};

const validationCache = new Map<string, CacheEntry>();

const normalizeWord = (word: string): string => word.trim().toLowerCase();

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
        .filter(Boolean);
};

const extractFirstDefinition = (xml: string, query: string): string | null => {
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const target = normalizeHeadword(query);
    if (!target) return null;

    for (const item of itemMatches) {
        const wordMatch = item.match(/<word>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/word>/);
        if (!wordMatch) continue;

        const headword = normalizeHeadword(wordMatch[1]?.trim() ?? "");
        if (headword !== target) continue;

        const definitionMatch = item.match(
            /<definition>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/definition>/
        );
        if (!definitionMatch) continue;

        const definition = definitionMatch[1]?.trim() ?? "";
        if (definition) return definition;
    }

    return null;
};

const normalizeHeadword = (word: string): string =>
    word
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[-^]/g, "")
        .replace(/\d+$/g, "");

const hasExactHeadword = (xml: string, query: string): boolean => {
    const target = normalizeHeadword(query);
    if (!target) return false;

    const headwords = extractWordsFromXml(xml);
    return headwords.some((headword) => normalizeHeadword(headword) === target);
};

export async function GET(request: NextRequest) {
    const inputWord = request.nextUrl.searchParams.get("word") ?? "";
    const word = normalizeWord(inputWord);
    if (!word) {
        return NextResponse.json({ error: "word query is required" }, { status: 400 });
    }

    const cached = validationCache.get(word);
    if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({
            exists: cached.exists,
            definition: cached.definition,
            source: "krdict-cache",
        });
    }

    const apiKey = process.env.KRDICT_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "KRDICT_API_KEY is not configured" },
            { status: 503 }
        );
    }

    const searchParams = new URLSearchParams({
        key: apiKey,
        q: word,
        req_type: "xml",
        part: "word",
        method: "exact",
        num: "20",
        advanced: "y",
        pos: "1",
    });

    try {
        const response = await fetch(`${KRDICT_SEARCH_URL}?${searchParams.toString()}`, {
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "failed to query krdict" },
                { status: 502 }
            );
        }

        const xml = await response.text();
        const exists = hasExactHeadword(xml, word);
        const definition = exists ? extractFirstDefinition(xml, word) : null;

        validationCache.set(word, {
            exists,
            definition,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return NextResponse.json({ exists, definition, source: "krdict" });
    } catch {
        return NextResponse.json({ error: "krdict request failed" }, { status: 502 });
    }
}
