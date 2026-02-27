"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppLanguage, GameMode, NavItem } from "@/features/game-shell/config";
import { NAV_ITEMS } from "@/features/game-shell/config";
import {
    Keyboard,
    CloudRain,
    Shield,
    GaugeCircle,
    Rabbit,
    NotebookPen,
    Link2,
} from "lucide-react";

const VISIBLE_MENU_ITEMS: readonly GameMode[] = ["practice", "word-chain", "tetris"];

interface NavMenuProps {
    language: AppLanguage;
    pathname: string;
    onNavigate: (mode: GameMode) => void;
    variant?: "full" | "compact";
}

const iconByType: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
    keyboard: Keyboard,
    rain: CloudRain,
    shield: Shield,
    race: GaugeCircle,
    runner: Rabbit,
    dictation: NotebookPen,
    chain: Link2,
};

export default function NavMenu({
    language,
    pathname,
    onNavigate,
    variant = "full",
}: NavMenuProps) {
    return (
        <nav className="p-3 space-y-1.5 flex-1">
            {NAV_ITEMS.filter((item) => VISIBLE_MENU_ITEMS.includes(item.id)).map((item) => {
                const active = pathname === `/${item.id}`;
                const Icon = iconByType[item.icon];
                return (
                    <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        onClick={() => onNavigate(item.id)}
                        aria-label={item.label[language]}
                        className={cn(
                            "w-full h-auto gap-2.5 rounded-none px-3 py-2 text-sm font-semibold border-2",
                            variant === "compact" ? "justify-center lg:justify-start" : "justify-start",
                            active
                                ? "border-[var(--retro-border-dark)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)] hover:text-[var(--retro-text-inverse)] hover:bg-[var(--retro-accent-2)]"
                                : "border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-surface)] text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)]"
                        )}
                    >
                        <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                        <span className={cn("truncate", variant === "compact" ? "hidden lg:inline" : "inline")}>
                            {item.label[language]}
                        </span>
                    </Button>
                );
            })}
        </nav>
    );
}
