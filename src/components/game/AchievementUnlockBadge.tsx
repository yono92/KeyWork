"use client";

import React from "react";
import type { AchievementDef } from "@/data/achievements";

interface Props {
    achievements: AchievementDef[];
    ko: boolean;
}

const AchievementUnlockBadge: React.FC<Props> = ({ achievements, ko }) => {
    if (achievements.length === 0) return null;

    return (
        <div className="mb-2 space-y-1.5">
            {achievements.map((a) => (
                <div
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--retro-accent)]/30 bg-[var(--retro-accent)]/10 px-2.5 py-1"
                    style={{ animation: "game-celebration 0.5s ease-out" }}
                >
                    <span className="text-sm">{a.icon}</span>
                    <span className="text-xs font-bold text-[var(--retro-accent)]">
                        {ko ? a.name.ko : a.name.en}
                    </span>
                    <span className="text-[10px] text-[var(--retro-text)]/50">
                        {ko ? "해금!" : "Unlocked!"}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default AchievementUnlockBadge;
