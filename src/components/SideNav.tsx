"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import useTypingStore from "../store/store";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import NavMenu from "./navigation/NavMenu";
import ControlTray from "./navigation/ControlTray";
import CoupangSidebarRail from "./affiliate/CoupangSidebarRail";
import type { GameMode, AppLanguage } from "@/features/game-shell/config";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


function RecordsSection({ language, pathname, onNavigate, variant = "full" }: {
    language: AppLanguage; pathname: string; onNavigate: (path: string) => void; variant?: "full" | "compact";
}) {
    const ko = language === "korean";

    return (
        <div className="px-3 pb-2 space-y-1.5">
            <p className="px-0 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/50">
                {ko ? "내 기록" : "Local data"}
            </p>
            <NavButton
                icon={Trophy}
                label={ko ? "내 기록" : "My Records"}
                active={pathname === "/leaderboard"}
                onClick={() => onNavigate("/leaderboard")}
                variant={variant}
            />
        </div>
    );
}

function NavButton({ icon: Icon, label, active, onClick, variant = "full", danger = false, disabled = false }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
    onClick: () => void;
    variant?: "full" | "compact";
    danger?: boolean;
    disabled?: boolean;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
                "w-full h-auto gap-2.5 rounded-none px-3 py-1.5 text-xs font-semibold border-2",
                variant === "compact" ? "justify-center lg:justify-start" : "justify-start",
                active
                    ? "border-[var(--retro-border-dark)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)] hover:text-[var(--retro-text-inverse)] hover:bg-[var(--retro-accent-2)]"
                    : danger
                        ? "border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-surface)] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        : "border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-surface)] text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)]",
                disabled && "cursor-default opacity-60 hover:bg-[var(--retro-surface)]",
            )}
        >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={cn("truncate", variant === "compact" ? "hidden lg:inline" : "inline")}>
                {label}
            </span>
        </Button>
    );
}

export default function SideNav() {
    const router = useRouter();
    const pathname = usePathname();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const mobileMenuOpen = useTypingStore((s) => s.mobileMenuOpen);
    const setMobileMenuOpen = useTypingStore((s) => s.setMobileMenuOpen);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname, setMobileMenuOpen]);

    const navigateTo = (mode: GameMode) => {
        if (pathname === `/${mode}`) {
            setMobileMenuOpen(false);
            return;
        }
        router.push(`/${mode}`);
        setMobileMenuOpen(false);
    };

    const navigateToPath = (path: string) => {
        if (pathname === path) {
            setMobileMenuOpen(false);
            return;
        }
        router.push(path);
        setMobileMenuOpen(false);
    };

    return (
        <>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent
                    side="left"
                    className="md:hidden w-72 p-0 border-r-2 border-r-[var(--retro-border-dark)] bg-[var(--retro-surface)] flex flex-col"
                >
                    <SheetHeader className={`retro-titlebar h-10 px-3 flex-row items-center justify-between space-y-0 border-b border-black/25 ${retroTheme === "mac-classic" ? "justify-center" : ""}`}>
                        {retroTheme === "mac-classic" && (
                            <div className="absolute left-3 retro-mac-lights" aria-hidden="true">
                                <span />
                                <span />
                                <span />
                            </div>
                        )}
                        <SheetTitle asChild>
                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="font-pixel text-current" style={{ fontSize: 9, letterSpacing: 2 }}>
                                KEYWORK
                            </Link>
                        </SheetTitle>
                    </SheetHeader>

                    <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/80">
                        Modes
                    </p>
                    <NavMenu language={language} pathname={pathname} onNavigate={navigateTo} />
                    <RecordsSection language={language} pathname={pathname} onNavigate={navigateToPath} />

                    <div className="mt-auto p-3 border-t-2 border-t-[var(--retro-border-mid)]">
                        <ControlTray />
                    </div>
                </SheetContent>
            </Sheet>

            <Card
                className="hidden md:flex md:flex-col md:w-24 lg:w-56 shrink-0 h-full sticky top-0
                bg-[var(--retro-surface)] text-inherit
                animate-panel-in"
            >
                <div className={`retro-titlebar h-10 px-3 flex items-center border-b border-black/25 ${retroTheme === "mac-classic" ? "justify-center relative" : ""}`}>
                    {retroTheme === "mac-classic" && (
                        <div className="absolute left-3 retro-mac-lights" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </div>
                    )}
                    <Link href="/" className="font-pixel text-current" style={{ fontSize: 9, letterSpacing: 2 }}>
                        <span className="hidden lg:inline">KEYWORK</span>
                        <span className="lg:hidden">KW</span>
                    </Link>
                </div>
                <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/80">
                    Modes
                </p>

                <NavMenu
                    language={language}
                    pathname={pathname}
                    onNavigate={navigateTo}
                    variant="compact"
                />
                <RecordsSection language={language} pathname={pathname} onNavigate={navigateToPath} variant="compact" />

                <div className="mt-auto overflow-hidden p-2.5 lg:p-3 border-t-2 border-t-[var(--retro-border-mid)]">
                    <CoupangSidebarRail />
                    <div className="mt-2">
                        <ControlTray variant="compact" />
                    </div>
                </div>
            </Card>
        </>
    );
}
