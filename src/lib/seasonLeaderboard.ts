import type { AvatarConfig } from "@/lib/supabase/types";
import type { LeaderboardPeriod } from "@/lib/supabase/types";

export interface LeaderboardScoreRow {
    user_id: string;
    score: number;
    created_at: string;
    profiles:
        | {
              nickname: string;
              avatar_url: string | null;
              avatar_config: AvatarConfig | null;
          }
        | null;
}

export interface SeasonLeaderboardEntry {
    rank: number;
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    avatar_config: AvatarConfig | null;
    score: number;
    created_at: string;
}

export interface SeasonLeaderboardSummary {
    entries: SeasonLeaderboardEntry[];
    totalPlayers: number;
    myEntry: SeasonLeaderboardEntry | null;
    cutoffIso: string | null;
}

export function getPeriodCutoff(period: LeaderboardPeriod, now = new Date()): string | null {
    if (period === "all") return null;

    const cutoff = new Date(now);

    if (period === "week") {
        const diffFromMonday = (cutoff.getDay() + 6) % 7;
        cutoff.setDate(cutoff.getDate() - diffFromMonday);
    } else if (period === "day") {
        cutoff.setHours(0, 0, 0, 0);
        return cutoff.toISOString();
    }

    cutoff.setHours(0, 0, 0, 0);
    return cutoff.toISOString();
}

export function aggregateSeasonLeaderboard(
    rows: readonly LeaderboardScoreRow[],
    currentUserId: string | null,
    limit = 10,
): SeasonLeaderboardSummary {
    const bestByUser = new Map<string, SeasonLeaderboardEntry>();

    for (const row of rows) {
        const current = bestByUser.get(row.user_id);
        const nextEntry: SeasonLeaderboardEntry = {
            rank: 0,
            user_id: row.user_id,
            nickname: row.profiles?.nickname ?? "Player",
            avatar_url: row.profiles?.avatar_url ?? null,
            avatar_config: row.profiles?.avatar_config ?? null,
            score: row.score,
            created_at: row.created_at,
        };

        if (!current) {
            bestByUser.set(row.user_id, nextEntry);
            continue;
        }

        const shouldReplace =
            row.score > current.score ||
            (row.score === current.score &&
                new Date(row.created_at).getTime() < new Date(current.created_at).getTime());

        if (shouldReplace) {
            bestByUser.set(row.user_id, nextEntry);
        }
    }

    const sorted = [...bestByUser.values()]
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        })
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return {
        entries: sorted.slice(0, limit),
        totalPlayers: sorted.length,
        myEntry: currentUserId ? sorted.find((entry) => entry.user_id === currentUserId) ?? null : null,
        cutoffIso: null,
    };
}

export function getWeeklySeasonEnd(now = new Date()): Date {
    const seasonEnd = new Date(now);
    const day = seasonEnd.getDay();
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day;

    seasonEnd.setDate(seasonEnd.getDate() + daysUntilNextMonday);
    seasonEnd.setHours(0, 0, 0, 0);

    return seasonEnd;
}

export function formatCountdown(targetDate: Date, now = new Date()) {
    const totalMs = Math.max(targetDate.getTime() - now.getTime(), 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        days,
        hours,
        minutes,
        seconds,
        totalMs,
    };
}
