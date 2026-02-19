import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const BASE_URL = "https://key-work-rho.vercel.app";

export const metadata: Metadata = {
    title: {
        default: "KeyWork - 타이핑 연습 게임",
        template: "%s | KeyWork",
    },
    description:
        "한국어와 영어 타이핑 실력을 게임으로 키워보세요. 문장연습, 단어낙하, 타이핑 디펜스, 타이핑 레이스, 타이핑 러너, 받아쓰기, 끝말잇기까지 7가지 모드를 제공합니다.",
    keywords: [
        "타이핑 연습",
        "타이핑 게임",
        "한글 타이핑",
        "영어 타이핑",
        "typing practice",
        "typing game",
        "끝말잇기",
        "받아쓰기",
        "KeyWork",
    ],
    authors: [{ name: "yono92", url: "https://github.com/yono92" }],
    metadataBase: new URL(BASE_URL),
    openGraph: {
        title: "KeyWork - 타이핑 연습 게임",
        description:
            "한국어와 영어 타이핑 실력을 게임으로 키워보세요. 7가지 게임 모드 제공.",
        url: BASE_URL,
        siteName: "KeyWork",
        images: [
            {
                url: "/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "KeyWork - 타이핑 연습 게임",
            },
        ],
        locale: "ko_KR",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "KeyWork - 타이핑 연습 게임",
        description:
            "한국어와 영어 타이핑 실력을 게임으로 키워보세요. 7가지 게임 모드 제공.",
        images: ["/og-image.jpg"],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body>
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:px-3 focus:py-2 focus:rounded-md focus:bg-cyan-600 focus:text-white"
                >
                    본문으로 건너뛰기
                </a>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')}catch(e){}`,
                    }}
                />
                {children}
            </body>
        </html>
    );
}
