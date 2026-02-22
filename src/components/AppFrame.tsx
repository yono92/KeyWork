"use client";

import React, { useEffect } from "react";
import type { ReactNode } from "react";
import SideNav from "./SideNav";
import useTypingStore from "../store/store";

interface AppFrameProps {
    children: ReactNode;
}

export default function AppFrame({ children }: AppFrameProps) {
    const darkMode = useTypingStore((state) => state.darkMode);
    const retroTheme = useTypingStore((state) => state.retroTheme);
    const hydrate = useTypingStore((state) => state._hydrate);

    // 마운트 시 localStorage에서 상태 복원
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // dark 클래스를 <html>에 동기화 (토글 시 즉시 반영)
    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
    }, [darkMode]);

    useEffect(() => {
        document.documentElement.setAttribute("data-retro-theme", retroTheme);
    }, [retroTheme]);

    return (
        <div className="relative h-screen overflow-hidden bg-[var(--retro-app-bg)]">
            <div className="relative z-10 h-full box-border p-2.5 md:p-3.5">
                <div className="flex h-full gap-2.5 md:gap-3.5">
                    <SideNav />
                    <main id="main-content" className="flex-1 min-w-0 min-h-0 h-full overflow-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
