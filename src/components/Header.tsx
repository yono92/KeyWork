"use client";

import React from "react";
import { usePathname } from "next/navigation";
import useTypingStore from "../store/store";

const PAGE_TITLES: Record<"korean" | "english", Record<string, string>> = {
    korean: {
        "/practice": "\uBB38\uC7A5\uC5F0\uC2B5",
        "/falling-words": "\uB2E8\uC5B4\uB099\uD558",
        "/typing-defense": "\uD0C0\uC774\uD551 \uB514\uD39C\uC2A4",
        "/typing-race": "\uD0C0\uC774\uD551 \uB808\uC774\uC2A4",
        "/dictation": "\uBC1B\uC544\uC4F0\uAE30",
        "/word-chain": "\uB05D\uB9D0\uC787\uAE30",
    },
    english: {
        "/practice": "Practice",
        "/falling-words": "Falling Words",
        "/typing-defense": "Typing Defense",
        "/typing-race": "Typing Race",
        "/dictation": "Dictation",
        "/word-chain": "Word Chain",
    },
};

export default function Header() {
    const pathname = usePathname();
    const language = useTypingStore((s) => s.language);
    const setMobileMenuOpen = useTypingStore((s) => s.setMobileMenuOpen);
    const pageTitle = PAGE_TITLES[language][pathname] ?? PAGE_TITLES[language]["/practice"];

    return (
        <header className="h-12 sm:h-14 px-3 sm:px-6 flex items-center gap-2 sm:gap-3">
            <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="Open menu"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>

            <div className="flex-1 text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-white">
                {pageTitle}
            </div>
        </header>
    );
}
