import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "KeyWork - 타이핑 연습 게임",
        short_name: "KeyWork",
        description:
            "한국어와 영어 타이핑 실력을 게임으로 키워보세요. 단어 낙하, 끝말잇기, 타이핑 레이스, 타이핑 디펜스, 받아쓰기 등 7가지 모드를 제공합니다.",
        start_url: "/practice",
        display: "standalone",
        background_color: "#1a1a2e",
        theme_color: "#2a7e7e",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "64x64",
                type: "image/x-icon",
            },
            {
                src: "/icon.svg",
                sizes: "any",
                type: "image/svg+xml",
            },
        ],
    };
}
