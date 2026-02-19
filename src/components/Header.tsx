"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Keyboard, CloudRain, Shield, GaugeCircle, Rabbit, NotebookPen, Link2 } from "lucide-react";
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";
import { getPageTitle, getModeByPathname } from "@/features/game-shell/config";

export default function Header() {
    const pathname = usePathname();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const setMobileMenuOpen = useTypingStore((s) => s.setMobileMenuOpen);
    const pageTitle = getPageTitle(language, pathname);
    const mode = getModeByPathname(pathname);
    const Icon = {
        keyboard: Keyboard,
        rain: CloudRain,
        shield: Shield,
        race: GaugeCircle,
        runner: Rabbit,
        dictation: NotebookPen,
        chain: Link2,
    }[mode.icon];

    return (
        <header className="retro-titlebar h-10 sm:h-11 px-2.5 sm:px-3.5 flex items-center gap-2 border-b border-black/25">
            <Button
                onClick={() => setMobileMenuOpen(true)}
                variant="ghost"
                size="icon"
                className="md:hidden h-7 w-7 border border-black/25 bg-white/25 text-current hover:bg-white/40 hover:text-current"
                aria-label="Open menu"
            >
                <Menu className="h-4 w-4" />
            </Button>

            {retroTheme === "mac-classic" && (
                <div className="hidden sm:flex retro-mac-lights" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </div>
            )}

            <div className={`flex-1 min-w-0 ${retroTheme === "mac-classic" ? "text-center" : ""}`}>
                <div className={`flex items-center ${retroTheme === "mac-classic" ? "justify-center gap-1.5" : "gap-2"}`}>
                    <Icon className="h-4 w-4 text-current" aria-hidden="true" />
                    <h1 className="truncate text-sm sm:text-[15px] font-semibold text-current">
                        {pageTitle}
                    </h1>
                </div>
            </div>
        </header>
    );
}
