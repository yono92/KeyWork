import React from "react";
import { useLocation } from "react-router-dom";

const Header: React.FC = () => {
    const location = useLocation();
    const pageTitle =
        location.pathname === "/falling-words" ? "소나기" : "문장연습";

    return (
        <header className="h-14 px-6 flex justify-between items-center">
            <div className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
                {pageTitle}
            </div>
            <div className="text-xs font-medium px-3 py-1 rounded-full bg-gradient-to-r from-sky-100 to-blue-100 text-sky-700 dark:from-sky-500/15 dark:to-cyan-500/15 dark:text-sky-300 border border-sky-200/50 dark:border-sky-500/20">
                KeyWork
            </div>
        </header>
    );
};

export default Header;
