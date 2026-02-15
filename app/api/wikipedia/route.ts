import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;
const MIN_LENGTH = 50;
const MAX_LENGTH = 500;

type WikiPage = {
    pageid: number;
    title: string;
    extract?: string;
};

type WikiResponse = {
    query?: {
        pages?: Record<string, WikiPage>;
    };
};

async function fetchRandomArticle(lang: string): Promise<{ title: string; text: string } | null> {
    const host = lang === "ko" ? "ko.wikipedia.org" : "en.wikipedia.org";
    const params = new URLSearchParams({
        action: "query",
        generator: "random",
        grnnamespace: "0",
        grnlimit: "1",
        prop: "extracts",
        exintro: "true",
        explaintext: "true",
        format: "json",
    });

    const res = await fetch(`https://${host}/w/api.php?${params.toString()}`, {
        headers: { "User-Agent": "KeyWork/1.0 (typing practice app)" },
        cache: "no-store",
    });

    if (!res.ok) return null;

    const data: WikiResponse = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    if (!page?.extract) return null;

    // 텍스트 정리: 줄바꿈 → 공백, 연속 공백 제거
    let text = page.extract
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (text.length < MIN_LENGTH) return null;

    // 최대 길이 초과 시 문장 단위로 자르기
    if (text.length > MAX_LENGTH) {
        const sentenceEnd = lang === "ko"
            ? /[.다요까죠네임음됨함!?]\s/g
            : /[.!?]\s/g;

        let cutIndex = MAX_LENGTH;
        let match: RegExpExecArray | null;
        sentenceEnd.lastIndex = 0;

        while ((match = sentenceEnd.exec(text)) !== null) {
            if (match.index + match[0].length <= MAX_LENGTH) {
                cutIndex = match.index + match[0].length;
            } else {
                break;
            }
        }

        text = text.slice(0, cutIndex).trim();
    }

    return { title: page.title, text };
}

export async function GET(request: NextRequest) {
    const langParam = request.nextUrl.searchParams.get("lang") ?? "ko";
    const lang = langParam === "en" ? "en" : "ko";

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const result = await fetchRandomArticle(lang);
            if (result) {
                return NextResponse.json(result);
            }
        } catch {
            // 재시도
        }
    }

    return NextResponse.json(
        { error: "위키백과에서 적절한 문서를 찾지 못했습니다" },
        { status: 502 }
    );
}
