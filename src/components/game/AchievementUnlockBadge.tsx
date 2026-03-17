"use client";

import React, { useEffect, useRef } from "react";
import type { AchievementDef } from "@/data/achievements";
import { useToastQueue } from "@/components/effects/ToastQueue";

interface Props {
    achievements: AchievementDef[];
    ko: boolean;
}

const AchievementUnlockBadge: React.FC<Props> = ({ achievements, ko }) => {
    const { push } = useToastQueue();
    const pushedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        for (const a of achievements) {
            if (pushedRef.current.has(a.id)) continue;
            pushedRef.current.add(a.id);
            push({
                type: "achievement",
                title: ko ? a.name.ko : a.name.en,
                subtitle: ko ? "업적 해금!" : "Achievement Unlocked!",
                icon: a.icon,
                duration: 4000,
            });
        }
    }, [achievements, ko, push]);

    if (achievements.length === 0) return null;

    return (
        <div className="mb-2 space-y-1.5">
            {achievements.map((a) => (
                <div
                    key={a.id}
                    className="inline-flex items-center gap-1.5 border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-light)] border-l-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] bg-[var(--retro-accent)]/10 px-2.5 py-1"
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
