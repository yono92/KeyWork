import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MuteToggle from "./MuteToggle";
import LanguageToggle from "./LanguageToggle";
import DarkModeToggle from "./DarkModeToggle";
import Logo from "./Logo";
import useTypingStore from "../store/store";

const NAV_ITEMS = [
    { id: "practice", label: "문장연습", shortLabel: "연습" },
    { id: "falling-words", label: "소나기", shortLabel: "소나기" },
    { id: "typing-defense", label: "타이핑 디펜스", shortLabel: "디펜스" },
    { id: "typing-race", label: "타이핑 레이스", shortLabel: "레이스" },
    { id: "dictation", label: "받아쓰기", shortLabel: "받아쓰기" },
    { id: "word-chain", label: "끝말잇기", shortLabel: "끝말잇기" },
] as const;

const SideNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const mobileMenuOpen = useTypingStore((s) => s.mobileMenuOpen);
    const setMobileMenuOpen = useTypingStore((s) => s.setMobileMenuOpen);

    // 경로 변경 시 메뉴 닫기
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname, setMobileMenuOpen]);

    const handleNavigate = (id: string) => {
        navigate(`/${id}`);
        setMobileMenuOpen(false);
    };

    return (
        <>
            {/* ========== 모바일 드로어 ========== */}

            {/* 배경 오버레이 */}
            <div
                className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
                    mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* 드로어 패널 */}
            <div
                className={`md:hidden fixed top-0 left-0 bottom-0 w-64 z-50
                    bg-white/95 dark:bg-[#162032]/95 backdrop-blur-xl
                    shadow-2xl shadow-black/20
                    transition-transform duration-300 ease-out
                    ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                {/* 드로어 헤더 */}
                <div className="h-14 px-4 flex items-center justify-between border-b border-sky-100/60 dark:border-white/5">
                    <Logo />
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* 드로어 네비게이션 */}
                <nav className="p-3 space-y-1.5 flex-1">
                    {NAV_ITEMS.map((item) => {
                        const active = location.pathname === `/${item.id}`;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavigate(item.id)}
                                className={`w-full flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                                    ${
                                        active
                                            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200"
                                    }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* 드로어 하단 토글 */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sky-100/60 dark:border-white/5">
                    <div className="mx-auto w-fit flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 dark:bg-white/5 p-1.5">
                        <MuteToggle />
                        <LanguageToggle />
                        <DarkModeToggle />
                    </div>
                </div>
            </div>

            {/* ========== 데스크탑 사이드바 ========== */}
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

                <nav className="p-3 space-y-1.5 flex-1">
                    {NAV_ITEMS.map((item) => {
                        const active = location.pathname === `/${item.id}`;
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(`/${item.id}`)}
                                className={`w-full flex items-center justify-center lg:justify-start rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                                    ${
                                        active
                                            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200"
                                    }`}
                            >
                                <span className="truncate">
                                    <span className="lg:hidden">{item.shortLabel}</span>
                                    <span className="hidden lg:inline">{item.label}</span>
                                </span>
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
};

export default SideNav;
