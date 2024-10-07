import React from "react";
import { BsMoonFill, BsSunFill } from "react-icons/bs"; // 아이콘 패키지 사용 (react-icons)
import useTypingStore from "../store/store";

const DarkModeToggle: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const toggleDarkMode = useTypingStore((state) => state.toggleDarkMode);

    return (
        <button
            onClick={toggleDarkMode}
            className="fixed bottom-4 right-4 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-full shadow-lg focus:outline-none"
        >
            {darkMode ? <BsSunFill size={24} /> : <BsMoonFill size={24} />}
        </button>
    );
};

export default DarkModeToggle;
