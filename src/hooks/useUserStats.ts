"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { NAV_ITEMS } from "@/features/game-shell/config";
import {
    aggregateUserStats,
    type AggregatedUserStats,
    type ModeStatsSummary,
    type RecentMatchSummary,
    type DailyMissionSummary,
    type StreakDaySummary,
    type ProgressionSummary,
} from "@/lib/userStats";

const DISPLAY_MODES = NAV_ITEMS.map((item) => item.id);

export function getModeLabel(mode: string, ko: boolean): string {
    const navItem = NAV_ITEMS.find((item) => item.id === mode);
    if (!navItem) return mode;
    return ko ? navItem.label.korean : navItem.label.english;
}

export type ModeStats = ModeStatsSummary;
export type RecentMatch = RecentMatchSummary;
export type DailyMission = DailyMissionSummary;
export type StreakDay = StreakDaySummary;
export type Progression = ProgressionSummary;
export type UserStats = AggregatedUserStats;

export function useUserStats() {
    const { user } = useAuthContext();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!user) {
            setStats(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();
            const { data: scores, error } = await supabase
                .from("game_scores")
                .select("id, game_mode, score, accuracy, wpm, is_multiplayer, is_win, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            setStats(aggregateUserStats(scores ?? [], DISPLAY_MODES));
        } catch {
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, refetch: fetchStats };
}
