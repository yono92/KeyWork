import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "끝말잇기",
    description: "AI와 끝말잇기 대결! 국립국어원 사전 기반 단어 검증, 두음법칙 지원, 실시간 온라인 대전 모드.",
    keywords: ["끝말잇기", "word chain", "단어 게임", "AI 대전", "한국어 게임", "온라인 대전"],
};

export default function WordChainLayout({ children }: { children: React.ReactNode }) {
    return children;
}
