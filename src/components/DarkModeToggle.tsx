import React from "react";
import { BsMoonFill, BsSunFill } from "react-icons/bs"; // 아이콘 패키지 사용 (react-icons)
import useTypingStore from "../store/store";

interface DarkModeToggleProps {
    className?: string;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ className = "" }) => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const toggleDarkMode = useTypingStore((state) => state.toggleDarkMode);

    return (
        <button
            onClick={toggleDarkMode}
            className={`${className}
                w-9 h-9 flex items-center justify-center
                rounded-lg focus:outline-none
                transition-all duration-200 hover:-translate-y-0.5
                text-slate-500 hover:text-sky-600
                dark:text-slate-400 dark:hover:text-sky-400
                hover:bg-sky-50 dark:hover:bg-white/5
            `}
        >
            {darkMode ? <BsSunFill size={16} /> : <BsMoonFill size={16} />}
        </button>
    );
};

export default DarkModeToggle;
