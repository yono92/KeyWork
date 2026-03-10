"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/supabase/types";

export function useLeaderboard(gameMode: string, period: LeaderboardPeriod = "all") {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc("get_leaderboard", {
                p_game_mode: gameMode,
                p_period: period,
                p_limit: 10,
            });
            if (error) throw error;
            setEntries((data as LeaderboardEntry[]) ?? []);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [gameMode, period]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { entries, loading, refetch: fetch };
}
