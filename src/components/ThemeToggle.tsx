"use client";

import React from "react";
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
    className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
    const retroTheme = useTypingStore((state) => state.retroTheme);
    const cycleRetroTheme = useTypingStore((state) => state.cycleRetroTheme);

    return (
        <Button
            onClick={cycleRetroTheme}
            variant="ghost"
            size="sm"
            className={`${className} min-w-16 text-[11px]`}
            aria-label={retroTheme === "win98" ? "Switch to Mac Classic theme" : "Switch to Windows 98 theme"}
        >
            {retroTheme === "win98" ? "WIN98" : "MAC"}
        </Button>
    );
};

export default ThemeToggle;
