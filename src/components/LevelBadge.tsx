"use client";

import React from "react";
import useTypingStore from "../store/store";
import { getLevel, getXpProgress } from "../utils/xpUtils";

export default function LevelBadge() {
    const xp = useTypingStore((s) => s.xp);
    const level = getLevel(xp);
    const { percent } = getXpProgress(xp);

    return (
        <div className="px-3 py-2.5 border-b border-sky-100/60 dark:border-white/5">
            <div className="flex items-center gap-2.5">
                {/* 레벨 원형 */}
                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-sky-500/20">
                    {level}
                </div>
                {/* lg: 텍스트 + XP 바 */}
                <div className="hidden lg:flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Lv.{level}
                    </span>
                    <div className="w-full h-1.5 rounded-full bg-slate-200/60 dark:bg-white/10 mt-0.5 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all duration-500"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
