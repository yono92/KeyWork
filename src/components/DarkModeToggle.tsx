import React from "react";
import { Moon, Sun } from "lucide-react";
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
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
    );
};

export default DarkModeToggle;
