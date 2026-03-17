import type { Metadata } from "next";
import MainLayout from "../../../src/components/MainLayout";

export const metadata: Metadata = {
    title: "문장연습",
    description: "한국어/영어 속담과 명언으로 타이핑 속도와 정확도를 높여보세요. 실시간 WPM 측정, 자모 단위 정확도 분석, 커스텀 텍스트 지원.",
    keywords: ["타이핑 연습", "문장 연습", "타자 속도", "WPM 측정", "한글 타이핑", "typing practice"],
};

export default function PracticePage() {
    return <MainLayout gameMode="practice" />;
}
