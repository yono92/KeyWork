"use client";

import { useCallback, useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/data/achievements";
import type { AchievementCheckContext, AchievementDef } from "@/data/achievements";
import { loadLocalScores } from "@/lib/localData";

export interface AchievementWithStatus {
    def: AchievementDef;
    unlocked: boolean;
    unlockedAt: string | null;
}

export function useAchievements() {
    const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [unlockedCount, setUnlockedCount] = useState(0);

    const fetch = useCallback(() => {
        setLoading(true);
        const scores = loadLocalScores();
        const allScores: AchievementCheckContext["allScores"] = scores.map((score) => ({
            game_mode: score.game_mode,
            score: score.score,
            wpm: score.wpm,
            accuracy: score.accuracy,
            is_multiplayer: false,
            is_win: null,
        }));
        const list = ACHIEVEMENTS.map((def) => {
            const matchedScore = scores.find((score) => def.check({ currentScore: score, allScores }));
            return {
                def,
                unlocked: Boolean(matchedScore),
                unlockedAt: matchedScore?.created_at ?? null,
            };
        });
        setAchievements(list);
        setUnlockedCount(list.filter((item) => item.unlocked).length);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { achievements, unlockedCount, totalCount: ACHIEVEMENTS.length, loading, refetch: fetch };
}
