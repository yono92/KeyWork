"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import useTypingStore from "../store/store";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import NavMenu from "./navigation/NavMenu";
import ControlTray from "./navigation/ControlTray";
import CoupangSidebarRail from "./affiliate/CoupangSidebarRail";
import type { GameMode, AppLanguage } from "@/features/game-shell/config";
import { Trophy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ExtraNavLinks({ language, pathname, onNavigate, variant = "full" }: {
    language: AppLanguage; pathname: string; onNavigate: (path: string) => void; variant?: "full" | "compact";
}) {
    const ko = language === "korean";
    const links = [
        { path: "/leaderboard", icon: Trophy, label: ko ? "랭킹" : "Leaderboard" },
        { path: "/profile", icon: User, label: ko ? "프로필" : "Profile" },
    ];
    return (
        <div className="px-3 pb-2 space-y-1.5">
            <p className="px-0 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/50">
                {ko ? "계정" : "Account"}
            </p>
            {links.map(({ path, icon: Icon, label }) => {
                const active = pathname === path;
                return (
                    <Button
                        key={path}
                        type="button"
                        variant="ghost"
                        onClick={() => onNavigate(path)}
                        aria-label={label}
                        className={cn(
                            "w-full h-auto gap-2.5 rounded-none px-3 py-1.5 text-xs font-semibold border-2",
                            variant === "compact" ? "justify-center lg:justify-start" : "justify-start",
                            active
                                ? "border-[var(--retro-border-dark)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)] hover:text-[var(--retro-text-inverse)] hover:bg-[var(--retro-accent-2)]"
                                : "border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-surface)] text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)]"
                        )}
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className={cn("truncate", variant === "compact" ? "hidden lg:inline" : "inline")}>
                            {label}
                        </span>
                    </Button>
                );
            })}
        </div>
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
                            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                <Logo />
                            </Link>
                        </SheetTitle>
                    </SheetHeader>

                    <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/80">
                        Modes
                    </p>
                    <NavMenu language={language} pathname={pathname} onNavigate={navigateTo} />
                    <ExtraNavLinks language={language} pathname={pathname} onNavigate={navigateToPath} />

                    <div className="mt-auto p-3 border-t-2 border-t-[var(--retro-border-mid)]">
                        <ControlTray />
                    </div>
                </SheetContent>
            </Sheet>

            <Card
                className="hidden md:flex md:flex-col w-20 lg:w-56 shrink-0 h-full sticky top-0
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
                    <Link href="/" className="w-full">
                        <div className="hidden lg:block">
                            <Logo />
                        </div>
                        <div className="lg:hidden">
                            <Logo compact />
                        </div>
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
                <ExtraNavLinks language={language} pathname={pathname} onNavigate={navigateToPath} variant="compact" />

                <div className="mt-auto p-3 border-t-2 border-t-[var(--retro-border-mid)]">
                    <CoupangSidebarRail />
                    <div className="mt-2">
                        <ControlTray />
                    </div>
                </div>
            </Card>
        </>
    );
}
