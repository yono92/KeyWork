"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import MuteToggle from "./MuteToggle";
import LanguageToggle from "./LanguageToggle";
import DarkModeToggle from "./DarkModeToggle";
import Logo from "./Logo";
import LevelBadge from "./LevelBadge";
import useTypingStore from "../store/store";

const NAV_ITEMS = [
    {
        id: "practice",
        icon: "⌨️",
        label: { korean: "\uBB38\uC7A5\uC5F0\uC2B5", english: "Practice" },
        shortLabel: { korean: "\uC5F0\uC2B5", english: "Practice" },
    },
    {
        id: "falling-words",
        icon: "🌧️",
        label: { korean: "\uB2E8\uC5B4\uB099\uD558", english: "Falling Words" },
        shortLabel: { korean: "\uB099\uD558", english: "Falling" },
    },
    {
        id: "typing-race",
        icon: "🏎️",
        label: { korean: "\uD0C0\uC774\uD551 \uB808\uC774\uC2A4", english: "Typing Race" },
        shortLabel: { korean: "\uB808\uC774\uC2A4", english: "Race" },
    },
    {
        id: "typing-runner",
        icon: "🏃",
        label: { korean: "\uD0C0\uC774\uD551 \uB7EC\uB108", english: "Typing Runner" },
        shortLabel: { korean: "\uB7EC\uB108", english: "Runner" },
    },
    {
        id: "dictation",
        icon: "📝",
        label: { korean: "\uBC1B\uC544\uC4F0\uAE30", english: "Dictation" },
        shortLabel: { korean: "\uBC1B\uC544\uC4F0\uAE30", english: "Dictation" },
    },
    {
        id: "word-chain",
        icon: "🔗",
        label: { korean: "\uB05D\uB9D0\uC787\uAE30", english: "Word Chain" },
        shortLabel: { korean: "\uB05D\uB9D0\uC787\uAE30", english: "Chain" },
    },
] as const;

export default function SideNav() {
    const router = useRouter();
    const pathname = usePathname();
    const language = useTypingStore((s) => s.language);
    const mobileMenuOpen = useTypingStore((s) => s.mobileMenuOpen);
    const setMobileMenuOpen = useTypingStore((s) => s.setMobileMenuOpen);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname, setMobileMenuOpen]);

    const navigateTo = (id: string) => {
        if (pathname === `/${id}`) {
            setMobileMenuOpen(false);
            return;
        }
        router.push(`/${id}`);
        setMobileMenuOpen(false);
    };

    return (
        <>
            <div
                className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
                    mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setMobileMenuOpen(false)}
            />

            <div
                className={`md:hidden fixed top-0 left-0 bottom-0 w-64 z-50
                    bg-white/95 dark:bg-[#162032]/95 backdrop-blur-xl
                    shadow-2xl shadow-black/20
                    transition-transform duration-300 ease-out
                    ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="h-14 px-4 flex items-center justify-between border-b border-sky-100/60 dark:border-white/5">
                    <Logo />
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close menu"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <nav className="p-3 space-y-1.5 flex-1">
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === `/${item.id}`;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => navigateTo(item.id)}
                                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                                    ${
                                        active
                                            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200"
                                    }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                {item.label[language]}
                            </button>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sky-100/60 dark:border-white/5">
                    <div className="mx-auto w-fit flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 dark:bg-white/5 p-1.5">
                        <MuteToggle />
                        <LanguageToggle />
                        <DarkModeToggle />
                    </div>
                </div>
            </div>

            <aside
                className="hidden md:flex md:flex-col w-20 lg:w-56 shrink-0 h-full sticky top-0 rounded-2xl
                border border-sky-200/40 dark:border-sky-500/10
                bg-white/80 dark:bg-[#162032]/80 backdrop-blur-xl
                shadow-lg shadow-sky-900/5 dark:shadow-black/20
                animate-panel-in"
            >
                <div className="h-14 px-4 flex items-center border-b border-sky-100/60 dark:border-white/5">
                    <div className="hidden lg:block">
                        <Logo />
                    </div>
                    <div className="lg:hidden">
                        <Logo compact />
                    </div>
                </div>

                <LevelBadge />

                <nav className="p-3 space-y-1.5 flex-1">
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === `/${item.id}`;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => navigateTo(item.id)}
                                className={`w-full flex items-center justify-center lg:justify-start gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                                    ${
                                        active
                                            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200"
                                    }`}
                            >
                                <span className="text-base shrink-0">{item.icon}</span>
                                <span className="truncate hidden lg:inline">{item.label[language]}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-sky-100/60 dark:border-white/5">
                    <div className="mx-auto w-fit flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 dark:bg-white/5 p-1.5">
                        <MuteToggle />
                        <LanguageToggle />
                        <DarkModeToggle />
                    </div>
                </div>
            </aside>
        </>
    );
}
