"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "./Logo";
import LevelBadge from "./LevelBadge";
import useTypingStore from "../store/store";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import NavMenu from "./navigation/NavMenu";
import ControlTray from "./navigation/ControlTray";
import type { GameMode } from "@/features/game-shell/config";

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

    return (
        <>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent
                    side="left"
                    className="md:hidden w-72 p-0 border-r-2 border-r-[var(--retro-border-dark)] bg-[var(--retro-surface)]"
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

                    <div className="absolute bottom-0 left-0 right-0 p-3 border-t-2 border-t-[var(--retro-border-mid)]">
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

                <LevelBadge />
                <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--retro-text)]/80">
                    Modes
                </p>

                <NavMenu
                    language={language}
                    pathname={pathname}
                    onNavigate={navigateTo}
                    variant="compact"
                />

                <div className="p-3 border-t-2 border-t-[var(--retro-border-mid)]">
                    <ControlTray />
                </div>
            </Card>
        </>
    );
}
