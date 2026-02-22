"use client";

import React from "react";
import useTypingStore from "../../store/store";

const ITEMS = [
    {
        id: "keyboard",
        label: { korean: "저소음 키보드", english: "Silent Keyboard" },
        href: "https://link.coupang.com/a/dQ6fSZ",
    },
    {
        id: "wrist-rest",
        label: { korean: "팜레스트", english: "Wrist Rest" },
        href: "https://link.coupang.com/a/dQ6g8G",
    },
    {
        id: "keyboard-2",
        label: { korean: "추천 키보드 2", english: "Keyboard Pick 2" },
        href: "https://link.coupang.com/a/dQ6hGM",
    },
] as const;

export default function CoupangSidebarRail() {
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);

    return (
        <aside
            className={`hidden lg:block border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-surface-alt)] p-2 ${
                retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
            }`}
            aria-label={language === "korean" ? "쿠팡 광고" : "Coupang ads"}
        >
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--retro-text)]/80">
                AD
            </p>

            <div className="space-y-1.5">
                {ITEMS.map((item) => (
                    <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="block border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-2 py-1.5 text-[11px] font-semibold text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)]"
                    >
                        {item.label[language]}
                    </a>
                ))}
            </div>
        </aside>
    );
}
