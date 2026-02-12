import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MuteToggle from "./MuteToggle";
import LanguageToggle from "./LanguageToggle";
import DarkModeToggle from "./DarkModeToggle";

const NAV_ITEMS = [
    { id: "practice", label: "문장연습", shortLabel: "연습" },
    { id: "falling-words", label: "소나기", shortLabel: "소나기" },
] as const;

const SideNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <aside
            className="w-20 lg:w-56 shrink-0 h-full sticky top-0 rounded-2xl
            border border-sky-200/40 dark:border-sky-500/10
            bg-white/80 dark:bg-[#162032]/80 backdrop-blur-xl
            shadow-lg shadow-sky-900/5 dark:shadow-black/20
            flex flex-col animate-panel-in"
        >
            <div className="h-14 px-4 flex items-center border-b border-sky-100/60 dark:border-white/5">
                <span className="hidden lg:block font-bold text-lg tracking-tight bg-gradient-to-r from-sky-600 to-cyan-500 dark:from-sky-400 dark:to-cyan-300 bg-clip-text text-transparent">
                    KeyWork
                </span>
                <span className="lg:hidden font-bold text-sky-600 dark:text-sky-400">
                    KW
                </span>
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
    );
};

export default SideNav;
