"use client";

import { useCallback, useEffect, useState } from "react";
import { NAV_ITEMS } from "@/features/game-shell/config";
import { loadLocalScores } from "@/lib/localData";
import {
    aggregateUserStats,
    type AggregatedUserStats,
    type ModeStatsSummary,
    type RecentMatchSummary,
    type DailyMissionSummary,
    type StreakDaySummary,
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
export type UserStats = AggregatedUserStats;

export function useUserStats() {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(() => {
        setLoading(true);
        setStats(aggregateUserStats(loadLocalScores(), DISPLAY_MODES));
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, refetch: fetchStats };
}
