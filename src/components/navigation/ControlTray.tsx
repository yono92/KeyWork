"use client";

import React from "react";
import MuteToggle from "../MuteToggle";
import LanguageToggle from "../LanguageToggle";
import DarkModeToggle from "../DarkModeToggle";
import ThemeToggle from "../ThemeToggle";

export default function ControlTray() {
    return (
        <div className="w-full grid grid-cols-4 gap-1.5 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface-alt)] p-1.5">
            <ThemeToggle className="w-full h-8 min-w-0 justify-center px-0 text-[10px] tracking-wide" />
            <MuteToggle className="w-full h-8 justify-center px-0" />
            <LanguageToggle className="w-full h-8 justify-center px-0" />
            <DarkModeToggle className="w-full h-8 justify-center px-0" />
        </div>
    );
}
