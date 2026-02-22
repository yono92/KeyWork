"use client";

import useTypingStore from "../../store/store";

const ITEMS = [
    {
        id: "keyboard",
        label: { korean: "저소음 키보드", english: "Silent Keyboard" },
        summary: { korean: "장시간 타이핑용", english: "For long typing sessions" },
        href: "https://link.coupang.com/a/dQ6fSZ",
    },
    {
        id: "wrist-rest",
        label: { korean: "팜레스트", english: "Wrist Rest" },
        summary: { korean: "손목 부담 완화", english: "Reduce wrist strain" },
        href: "https://link.coupang.com/a/dQ6g8G",
    },
    {
        id: "keyboard-2",
        label: { korean: "추천 키보드 2", english: "Keyboard Pick 2" },
        summary: { korean: "가성비/입문용", english: "Budget-friendly pick" },
        href: "https://link.coupang.com/a/dQ6hGM",
    },
] as const;

export default function CoupangSidebarRail() {
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);

    return (
        <aside
            className={`hidden lg:block border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-surface-alt)] p-2.5 ${
                retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
            }`}
            aria-label={language === "korean" ? "쿠팡 파트너스 광고" : "Coupang Partners ad"}
        >
            <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center rounded-sm bg-[#f97316] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                    AD
                </span>
                <span className="text-[10px] font-semibold text-[var(--retro-text)]/75">
                    {language === "korean" ? "쿠팡 파트너스" : "Coupang Partners"}
                </span>
            </div>

            <div className="space-y-2">
                {ITEMS.map((item) => (
                    <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="block border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] p-2 transition-colors hover:bg-[var(--retro-surface-alt)]"
                    >
                        <p className="text-[11px] font-bold text-[var(--retro-text)]">{item.label[language]}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--retro-text)]/75">{item.summary[language]}</p>
                        <p className="mt-1 text-[10px] font-semibold text-[#f97316]">
                            {language === "korean" ? "쿠팡에서 보기 >" : "View on Coupang >"}
                        </p>
                    </a>
                ))}
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-[var(--retro-text)]/65">
                {language === "korean"
                    ? "쿠팡 파트너스 활동의 일환으로 일정 수수료를 제공받을 수 있습니다."
                    : "This app may receive a commission from qualifying purchases."}
            </p>
        </aside>
    );
}
