import { describe, expect, it, vi } from "vitest";
import { aggregateUserStats, type ScoreStatRow } from "@/lib/userStats";

describe("aggregateUserStats", () => {
    it("builds daily missions and streaks from score history", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-13T09:00:00+09:00"));

        const scores: ScoreStatRow[] = [
            {
                id: 1,
                game_mode: "practice",
                score: 300,
                accuracy: 98,
                wpm: 72,
                is_multiplayer: false,
                is_win: null,
                created_at: "2026-03-13T08:00:00+09:00",
            },
            {
                id: 2,
                game_mode: "tetris",
                score: 1200,
                accuracy: null,
                wpm: null,
                is_multiplayer: true,
                is_win: true,
                created_at: "2026-03-13T07:40:00+09:00",
            },
            {
                id: 3,
                game_mode: "practice",
                score: 280,
                accuracy: 96,
                wpm: 68,
                is_multiplayer: false,
                is_win: null,
                created_at: "2026-03-12T21:00:00+09:00",
            },
            {
                id: 4,
                game_mode: "word-chain",
                score: 410,
                accuracy: null,
                wpm: null,
                is_multiplayer: false,
                is_win: null,
                created_at: "2026-03-11T20:00:00+09:00",
            },
            {
                id: 5,
                game_mode: "practice",
                score: 260,
                accuracy: 94,
                wpm: 65,
                is_multiplayer: false,
                is_win: null,
                created_at: "2026-03-09T18:00:00+09:00",
            },
        ];

        const stats = aggregateUserStats(scores, [
            "practice",
            "falling-words",
            "word-chain",
            "typing-runner",
            "tetris",
        ]);

        expect(stats.totalPlays).toBe(5);
        expect(stats.mostPlayedMode).toBe("practice");
        expect(stats.multiplayer.winRate).toBe(100);
        expect(stats.activity.currentStreak).toBe(3);
        expect(stats.activity.longestStreak).toBe(3);
        expect(stats.activity.activeToday).toBe(true);
        expect(stats.activity.completedMissionCount).toBe(2);
        expect(stats.activity.dailyMissions).toEqual([
            { id: "plays", current: 2, target: 3, completed: false },
            { id: "modes", current: 2, target: 2, completed: true },
            { id: "multiplayer", current: 1, target: 1, completed: true },
        ]);
        expect(stats.activity.recentDays[6]).toMatchObject({
            key: "2026-03-13",
            played: true,
            playCount: 2,
        });

        vi.useRealTimers();
    });

    it("returns zeroed activity when there is no history", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-13T09:00:00+09:00"));

        const stats = aggregateUserStats([], ["practice", "tetris"]);

        expect(stats.totalPlays).toBe(0);
        expect(stats.mostPlayedMode).toBeNull();
        expect(stats.activity.currentStreak).toBe(0);
        expect(stats.activity.longestStreak).toBe(0);
        expect(stats.activity.activeToday).toBe(false);
        expect(stats.activity.completedMissionCount).toBe(0);
        expect(stats.activity.dailyMissions).toEqual([
            { id: "plays", current: 0, target: 3, completed: false },
            { id: "modes", current: 0, target: 2, completed: false },
            { id: "multiplayer", current: 0, target: 1, completed: false },
        ]);

        vi.useRealTimers();
    });
});
