import React from "react";
import { BsMoonFill, BsSunFill } from "react-icons/bs"; // 아이콘 패키지 사용 (react-icons)
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";

interface DarkModeToggleProps {
    className?: string;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ className = "" }) => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const toggleDarkMode = useTypingStore((state) => state.toggleDarkMode);

    return (
        <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className={`${className} text-slate-700 dark:text-slate-200`}
            aria-label={darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
            {darkMode ? <BsSunFill size={16} /> : <BsMoonFill size={16} />}
        </Button>
    );
};

export default DarkModeToggle;
