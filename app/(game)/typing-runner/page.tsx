import type { Metadata } from "next";
import MainLayout from "../../../src/components/MainLayout";

export const metadata: Metadata = {
    title: "타이핑 러너",
    description: "단어를 타이핑해서 장애물을 뛰어넘으세요! 점점 빨라지는 속도, 마일스톤 보너스, AI 대전 레이스 모드.",
    keywords: ["타이핑 러너", "러너 게임", "typing runner", "타이핑 레이스", "달리기 게임"],
};

export default function TypingRunnerPage() {
    return <MainLayout gameMode="typing-runner" />;
}
