import { describe, expect, it, vi } from "vitest";
import {
    aggregateSeasonLeaderboard,
    formatCountdown,
    getPeriodCutoff,
    getWeeklySeasonEnd,
    type LeaderboardScoreRow,
} from "@/lib/seasonLeaderboard";

describe("seasonLeaderboard", () => {
    it("keeps only the best score per user and ranks by score", () => {
        const rows: LeaderboardScoreRow[] = [
            {
                user_id: "u1",
                score: 1200,
                created_at: "2026-03-13T02:00:00.000Z",
                profiles: { nickname: "Alpha", avatar_url: null, avatar_config: null },
            },
            {
                user_id: "u1",
                score: 1500,
                created_at: "2026-03-13T03:00:00.000Z",
                profiles: { nickname: "Alpha", avatar_url: null, avatar_config: null },
            },
            {
                user_id: "u2",
                score: 1500,
                created_at: "2026-03-13T01:00:00.000Z",
                profiles: { nickname: "Bravo", avatar_url: null, avatar_config: null },
            },
            {
                user_id: "u3",
                score: 900,
                created_at: "2026-03-13T04:00:00.000Z",
                profiles: { nickname: "Charlie", avatar_url: null, avatar_config: null },
            },
        ];

        const result = aggregateSeasonLeaderboard(rows, "u3");

        expect(result.totalPlayers).toBe(3);
        expect(result.entries.map((entry) => [entry.rank, entry.nickname, entry.score])).toEqual([
            [1, "Bravo", 1500],
            [2, "Alpha", 1500],
            [3, "Charlie", 900],
        ]);
        expect(result.myEntry?.rank).toBe(3);
        expect(result.myEntry?.score).toBe(900);
    });

    it("returns weekly and daily cutoffs", () => {
        const now = new Date(2026, 2, 13, 21, 0, 0);
        const weekCutoff = new Date(getPeriodCutoff("week", now)!);
        const dayCutoff = new Date(getPeriodCutoff("day", now)!);

        expect(getPeriodCutoff("all", now)).toBeNull();
        expect([
            weekCutoff.getFullYear(),
            weekCutoff.getMonth(),
            weekCutoff.getDate(),
            weekCutoff.getHours(),
            weekCutoff.getMinutes(),
        ]).toEqual([2026, 2, 9, 0, 0]);
        expect([
            dayCutoff.getFullYear(),
            dayCutoff.getMonth(),
            dayCutoff.getDate(),
            dayCutoff.getHours(),
            dayCutoff.getMinutes(),
        ]).toEqual([2026, 2, 13, 0, 0]);
    });

    it("calculates weekly season end and countdown", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 2, 13, 9, 0, 0));

        const seasonEnd = getWeeklySeasonEnd(new Date());
        const countdown = formatCountdown(seasonEnd, new Date(2026, 2, 13, 9, 0, 0));

        expect([
            seasonEnd.getFullYear(),
            seasonEnd.getMonth(),
            seasonEnd.getDate(),
            seasonEnd.getHours(),
            seasonEnd.getMinutes(),
        ]).toEqual([2026, 2, 16, 0, 0]);
        expect(countdown).toMatchObject({
            days: 2,
            hours: 15,
            minutes: 0,
            seconds: 0,
        });

        vi.useRealTimers();
    });
});
