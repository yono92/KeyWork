import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "레트로 테트리스",
    description: "고스트와 홀드를 지원하는 클래식 10×20 레트로 테트리스입니다. 7-bag 블록과 단계별 속도에 도전해 보세요.",
    keywords: ["테트리스", "retro tetris", "클래식 게임", "블록 퍼즐", "고스트", "홀드"],
};

export default function TetrisLayout({ children }: { children: React.ReactNode }) {
    return children;
}
