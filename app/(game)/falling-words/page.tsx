import type { Metadata } from "next";
import MainLayout from "../../../src/components/MainLayout";

export const metadata: Metadata = {
    title: "단어낙하",
    description: "하늘에서 떨어지는 단어를 타이핑으로 격파하세요! 콤보 시스템, 파워업 아이템, 골든 워드 보너스로 최고 점수에 도전.",
    keywords: ["단어 낙하", "타이핑 게임", "아케이드", "falling words", "typing game", "콤보"],
};

export default function FallingWordsPage() {
    return <MainLayout gameMode="falling-words" />;
}
