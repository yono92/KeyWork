import React from "react";
import { useLocation } from "react-router-dom";
import useTypingStore from "../store/store";

const Header: React.FC = () => {
    const location = useLocation();
    const setMobileMenuOpen = useTypingStore((s) => s.setMobileMenuOpen);

    const pageTitles: Record<string, string> = {
        "/practice": "문장연습",
        "/falling-words": "소나기",
        "/typing-defense": "타이핑 디펜스",
        "/typing-race": "타이핑 레이스",
        "/dictation": "받아쓰기",
        "/word-chain": "끝말잇기",
    };
    const pageTitle = pageTitles[location.pathname] ?? "문장연습";

    return (
        <header className="h-12 sm:h-14 px-3 sm:px-6 flex items-center gap-2 sm:gap-3">
            {/* 햄버거 버튼 — 모바일 전용 */}
            <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
};

export default Header;
