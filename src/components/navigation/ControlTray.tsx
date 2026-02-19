"use client";

import React from "react";
import MuteToggle from "../MuteToggle";
import LanguageToggle from "../LanguageToggle";
import DarkModeToggle from "../DarkModeToggle";
import ThemeToggle from "../ThemeToggle";

export default function ControlTray() {
    return (
        <div className="mx-auto w-fit flex items-center justify-center gap-1.5 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-surface-alt)] p-1.5">
            <ThemeToggle />
            <MuteToggle />
            <LanguageToggle />
            <DarkModeToggle />
        </div>
    );
}
