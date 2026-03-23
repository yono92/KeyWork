import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "워터트리스",
    description: "물 물리 기반 퍼즐 게임! 블록이 물방울로 변해 흘러내리는 워터트리스. 같은 색 물이 연결되면 클리어! 모바일 터치 지원, 실시간 온라인 대전.",
    keywords: ["워터트리스", "watertris", "물 퍼즐", "온라인 대전", "레트로 게임", "블록 퍼즐"],
};

export default function TetrisLayout({ children }: { children: React.ReactNode }) {
    return children;
}
