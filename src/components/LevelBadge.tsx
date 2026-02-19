"use client";

import React from "react";
import useTypingStore from "../store/store";
import { getLevel, getXpProgress } from "../utils/xpUtils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function LevelBadge() {
    const xp = useTypingStore((s) => s.xp);
    const level = getLevel(xp);
    const { percent } = getXpProgress(xp);

    return (
        <div className="px-3 py-2.5 border-b-2 border-[var(--retro-border-mid)]">
            <div className="flex items-center gap-2.5">
                {/* 레벨 원형 */}
                <div className="w-9 h-9 shrink-0 border-2 border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-accent)] flex items-center justify-center text-[var(--retro-text-inverse)] text-sm font-bold">
                    {level}
                </div>
                {/* lg: 텍스트 + XP 바 */}
                <div className="hidden lg:flex flex-col flex-1 min-w-0">
                    <Badge
                        variant="secondary"
                        className="w-fit px-1.5 py-0 text-[10px] font-semibold"
                    >
                        Lv.{level}
                    </Badge>
                    <Progress
                        value={percent}
                        className="mt-1"
                    />
                </div>
            </div>
        </div>
    );
}
