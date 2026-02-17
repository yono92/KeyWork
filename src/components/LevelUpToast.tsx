"use client";

import React, { useEffect, useRef, useState } from "react";
import useTypingStore from "../store/store";
import { getLevel } from "../utils/xpUtils";

export default function LevelUpToast() {
    const xp = useTypingStore((s) => s.xp);
    const [showLevel, setShowLevel] = useState<number | null>(null);
    const prevLevelRef = useRef<number>(getLevel(xp));

    useEffect(() => {
        const currentLevel = getLevel(xp);
        if (currentLevel > prevLevelRef.current && prevLevelRef.current > 0) {
            setShowLevel(currentLevel);
            const timer = setTimeout(() => setShowLevel(null), 2000);
            prevLevelRef.current = currentLevel;
            return () => clearTimeout(timer);
        }
        prevLevelRef.current = currentLevel;
    }, [xp]);

    if (showLevel === null) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <div className="absolute top-1/2 left-1/2 animate-level-up pointer-events-none">
                <div className="flex flex-col items-center gap-2 px-8 py-5 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-2xl shadow-sky-500/40">
                    <span className="text-white/80 text-sm font-semibold tracking-wider uppercase">
                        Level Up!
                    </span>
                    <span className="text-white text-4xl font-black">
                        Lv.{showLevel}
                    </span>
                    {/* 반짝임 효과 */}
                    <div className="absolute inset-0 rounded-2xl bg-white/20 animate-shimmer pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
