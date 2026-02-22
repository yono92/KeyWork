"use client";

import React from "react";
import useTypingStore from "../../store/store";

type AffiliateItem = {
    id: "keyboard" | "wrist-rest" | "headset";
    label: { korean: string; english: string };
    desc: { korean: string; english: string };
    href: string;
};

const AFFILIATE_ITEMS: readonly AffiliateItem[] = [
    {
        id: "keyboard",
        label: { korean: "저소음 키보드", english: "Silent Keyboard" },
        desc: { korean: "장시간 타이핑에 편한 스위치", english: "Comfortable for long typing sessions" },
        href: "https://link.coupang.com/a/dQ6fSZ",
    },
    {
        id: "wrist-rest",
        label: { korean: "손목 받침대", english: "Wrist Rest" },
        desc: { korean: "손목 부담 완화를 위한 기본 아이템", english: "A basic item to reduce wrist strain" },
        href: "https://link.coupang.com/a/dQ6g8G",
    },
    {
        id: "headset",
        label: { korean: "헤드셋/마이크", english: "Headset/Mic" },
        desc: { korean: "받아쓰기 모드에 유용한 장비", english: "Useful gear for dictation mode" },
        href: "https://link.coupang.com/a/dQ6hGM",
    },
] as const;

export default function CoupangAffiliateSection() {
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);

    return (
        <section
            className={`mt-4 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-surface-alt)] p-3 text-left ${
                retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
            }`}
            aria-label={language === "korean" ? "쿠팡 파트너스 추천" : "Coupang Partners picks"}
        >
            <p className="text-xs font-semibold mb-2 text-[var(--retro-text)]">
                {language === "korean" ? "추천 장비" : "Recommended gear"}
            </p>

            <div className="space-y-1.5">
                {AFFILIATE_ITEMS.map((item) => (
                    <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="block border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-2.5 py-2 hover:bg-[var(--retro-surface-alt)]"
                    >
                        <p className="text-xs font-semibold text-[var(--retro-text)]">{item.label[language]}</p>
                        <p className="text-[11px] text-[var(--retro-text)]/80">{item.desc[language]}</p>
                    </a>
                ))}
            </div>

            <p className="mt-2 text-[10px] text-[var(--retro-text)]/70 leading-relaxed">
                {language === "korean"
                    ? "쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다."
                    : "As a Coupang Partners affiliate, this app may receive a commission from qualifying purchases."}
            </p>
        </section>
    );
}
