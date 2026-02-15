import React from "react";
import { BsGlobe } from "react-icons/bs";
import useTypingStore from "../store/store";

interface LanguageToggleProps {
    className?: string;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = "" }) => {
    const language = useTypingStore((state) => state.language);
    const toggleLanguage = useTypingStore((state) => state.toggleLanguage);

    return (
        <button
            onClick={toggleLanguage}
            className={`${className}
                w-9 h-9 flex items-center justify-center
                rounded-lg focus:outline-none
                transition-all duration-200 hover:-translate-y-0.5
                text-slate-500 hover:text-sky-600
                dark:text-slate-400 dark:hover:text-sky-400
                hover:bg-sky-50 dark:hover:bg-white/5
            `}
            aria-label={
                language === "korean"
                    ? "Switch to English"
                    : "Switch to Korean"
            }
        >
            <BsGlobe size={16} />
        </button>
    );
};

export default LanguageToggle;
