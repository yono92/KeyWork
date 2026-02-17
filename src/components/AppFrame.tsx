"use client";

import React, { useEffect } from "react";
import type { ReactNode } from "react";
import SideNav from "./SideNav";
import LevelUpToast from "./LevelUpToast";
import BackgroundParticles from "./BackgroundParticles";
import useTypingStore from "../store/store";

interface AppFrameProps {
    children: ReactNode;
}

export default function AppFrame({ children }: AppFrameProps) {
    const darkMode = useTypingStore((state) => state.darkMode);

    // dark 클래스를 <html>에 동기화 (토글 시 즉시 반영)
    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
    }, [darkMode]);

    return (
        <div className="relative h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-[#0c1222] dark:via-[#111a2e] dark:to-[#0c1222]">
            <BackgroundParticles />
            <div className="relative z-10 h-full box-border p-2.5 md:p-3.5">
                <div className="flex h-full gap-2.5 md:gap-3.5">
                    <SideNav />
                    <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden">
                        {children}
                    </div>
                </div>
            </div>
            <LevelUpToast />
        </div>
    );
}
