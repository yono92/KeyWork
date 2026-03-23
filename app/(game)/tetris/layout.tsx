import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "샌드트리스",
    description: "모래 물리 기반 퍼즐 게임! 블록이 모래로 변해 쌓이는 샌드트리스. 같은 색이 연결되면 클리어! 모바일 터치 지원, 실시간 온라인 대전.",
    keywords: ["샌드트리스", "sandtris", "모래 퍼즐", "온라인 대전", "레트로 게임", "블록 퍼즐"],
};

export default function TetrisLayout({ children }: { children: React.ReactNode }) {
    return children;
}
