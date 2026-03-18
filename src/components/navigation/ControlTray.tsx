"use client";

import React from "react";
import MuteToggle from "../MuteToggle";
import LanguageToggle from "../LanguageToggle";
import DarkModeToggle from "../DarkModeToggle";
import ThemeToggle from "../ThemeToggle";
import FxToggle from "../FxToggle";
import { cn } from "@/lib/utils";

interface ControlTrayProps {
    variant?: "full" | "compact";
}

export default function ControlTray({ variant = "full" }: ControlTrayProps) {
    return (
        <div
            className={cn(
                "w-full border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface-alt)] p-1.5",
                variant === "compact"
                    ? "grid grid-cols-1 gap-1.5 lg:grid-cols-5"
                    : "grid grid-cols-5 gap-1.5",
            )}
        >
            <ThemeToggle
                compact={variant === "compact"}
                className={cn(
                    "w-full min-w-0 justify-center px-0",
                    variant === "compact"
                        ? "h-9 text-[9px] tracking-[0.08em] lg:h-8 lg:text-[10px] lg:tracking-wide"
                        : "h-8 text-[10px] tracking-wide",
                )}
            />
            <FxToggle className={cn("w-full justify-center px-0", variant === "compact" ? "h-9 lg:h-8" : "h-8")} />
            <MuteToggle className={cn("w-full justify-center px-0", variant === "compact" ? "h-9 lg:h-8" : "h-8")} />
            <LanguageToggle className={cn("w-full justify-center px-0", variant === "compact" ? "h-9 lg:h-8" : "h-8")} />
            <DarkModeToggle className={cn("w-full justify-center px-0", variant === "compact" ? "h-9 lg:h-8" : "h-8")} />
        </div>
    );
}
