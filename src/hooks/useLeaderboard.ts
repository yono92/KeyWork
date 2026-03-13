"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardPeriod } from "@/lib/supabase/types";
import {
    aggregateSeasonLeaderboard,
    getPeriodCutoff,
    type LeaderboardScoreRow,
    type SeasonLeaderboardEntry,
} from "@/lib/seasonLeaderboard";

interface LeaderboardSummary {
    totalPlayers: number;
    myEntry: SeasonLeaderboardEntry | null;
}

export function useLeaderboard(gameMode: string, period: LeaderboardPeriod = "all", currentUserId: string | null = null) {
    const [entries, setEntries] = useState<SeasonLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<LeaderboardSummary>({
        totalPlayers: 0,
        myEntry: null,
    });

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const cutoff = getPeriodCutoff(period);
            let query = supabase
                .from("game_scores")
                .select("user_id, score, created_at, profiles!game_scores_user_id_fkey(nickname, avatar_url, avatar_config)")
                .eq("game_mode", gameMode)
                .order("score", { ascending: false })
                .order("created_at", { ascending: true });

            if (cutoff) {
                query = query.gt("created_at", cutoff);
            }

            const { data, error } = await query;
            if (error) throw error;

            const normalizedRows: LeaderboardScoreRow[] = (data ?? []).map((row) => {
                const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                return {
                    user_id: row.user_id,
                    score: row.score,
                    created_at: row.created_at,
                    profiles: profile
                        ? {
                              nickname: profile.nickname,
                              avatar_url: profile.avatar_url,
                              avatar_config: profile.avatar_config,
                          }
                        : null,
                };
            });

            const aggregated = aggregateSeasonLeaderboard(
                normalizedRows,
                currentUserId,
            );

            setEntries(aggregated.entries);
            setSummary({
                totalPlayers: aggregated.totalPlayers,
                myEntry: aggregated.myEntry,
            });
        } catch {
            setEntries([]);
            setSummary({
                totalPlayers: 0,
                myEntry: null,
            });
        } finally {
            setLoading(false);
        }
    }, [currentUserId, gameMode, period]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { entries, loading, summary, refetch: fetch };
}
