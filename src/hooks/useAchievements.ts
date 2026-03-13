"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { ACHIEVEMENTS } from "@/data/achievements";
import type { AchievementDef } from "@/data/achievements";

export interface AchievementWithStatus {
    def: AchievementDef;
    unlocked: boolean;
    unlockedAt: string | null;
}

export function useAchievements() {
    const { user } = useAuthContext();
    const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [unlockedCount, setUnlockedCount] = useState(0);

    const fetch = useCallback(async () => {
        if (!user) {
            setAchievements([]);
            setUnlockedCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("user_achievements")
                .select("achievement_id, unlocked_at")
                .eq("user_id", user.id);

            if (error) throw error;

            const unlockedMap = new Map(
                (data ?? []).map((a) => [a.achievement_id, a.unlocked_at]),
            );

            const list: AchievementWithStatus[] = ACHIEVEMENTS.map((def) => ({
                def,
                unlocked: unlockedMap.has(def.id),
                unlockedAt: unlockedMap.get(def.id) ?? null,
            }));

            setAchievements(list);
            setUnlockedCount(list.filter((a) => a.unlocked).length);
        } catch {
            setAchievements([]);
            setUnlockedCount(0);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { achievements, unlockedCount, totalCount: ACHIEVEMENTS.length, loading, refetch: fetch };
}
