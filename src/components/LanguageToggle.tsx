import React from "react";
import { BsGlobe } from "react-icons/bs";
import useTypingStore from "../store/store";

interface LanguageToggleProps {
    language: "korean" | "english";
    toggleLanguage: () => void;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({
    language,
    toggleLanguage,
}) => {
    const darkMode = useTypingStore((state) => state.darkMode);

    return (
        <button
            onClick={toggleLanguage}
            className={`fixed bottom-4 right-20 
                flex items-center gap-2 
                p-3 rounded-full shadow-lg 
                focus:outline-none
                transition-colors duration-200
                ${
                    darkMode
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }
            `}
            aria-label={
                language === "korean" ? "Switch to English" : "한국어 전환"
            }
        >
            <BsGlobe size={24} />
        </button>
    );
};

export default LanguageToggle;
