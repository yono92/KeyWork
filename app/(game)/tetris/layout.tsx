import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "테트리스",
    description: "클래식 테트리스를 레트로 스타일로! 라인 클리어, 콤보, 홀드 기능, 모바일 터치 지원, 실시간 온라인 대전.",
    keywords: ["테트리스", "tetris", "블록 퍼즐", "온라인 대전", "레트로 게임", "클래식 게임"],
};

export default function TetrisLayout({ children }: { children: React.ReactNode }) {
    return children;
}
