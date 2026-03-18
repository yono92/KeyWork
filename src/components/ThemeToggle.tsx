"use client";

import React from "react";
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
    className?: string;
    compact?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "", compact = false }) => {
    const retroTheme = useTypingStore((state) => state.retroTheme);
    const cycleRetroTheme = useTypingStore((state) => state.cycleRetroTheme);

    return (
        <Button
            onClick={cycleRetroTheme}
            variant="ghost"
            size="sm"
            className={cn("min-w-16 text-[11px]", className)}
            aria-label={retroTheme === "win98" ? "Switch to Mac Classic theme" : "Switch to Windows 98 theme"}
        >
            {retroTheme === "win98" ? (compact ? "WIN" : "WIN98") : "MAC"}
        </Button>
    );
};

export default ThemeToggle;
