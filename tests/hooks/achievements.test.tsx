import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { useAchievements } from "@/hooks/useAchievements";

const mocks = vi.hoisted(() => {
    const insert = vi.fn();
    const achievementsEq = vi.fn();
    const scoresOrder = vi.fn();
    const scoresEq = vi.fn(() => ({ order: scoresOrder }));
    const currentUser = { value: null as { id: string } | null };

    const from = vi.fn((table: string) => {
        if (table === "user_achievements") {
            return {
                select: vi.fn(() => ({ eq: achievementsEq })),
                insert,
            };
        }

        if (table === "game_scores") {
            return {
                select: vi.fn(() => ({ eq: scoresEq })),
            };
        }

        throw new Error(`Unexpected table: ${table}`);
    });

    return {
        achievementsEq,
        currentUser,
        from,
        insert,
        scoresEq,
        scoresOrder,
    };
});

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: mocks.from,
    }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
    useAuthContext: () => ({
        user: mocks.currentUser.value,
        profile: null,
        isLoggedIn: !!mocks.currentUser.value,
        loading: false,
    }),
}));

describe("achievements hooks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.currentUser.value = null;
        mocks.achievementsEq.mockResolvedValue({ data: [], error: null });
        mocks.scoresOrder.mockResolvedValue({ data: [], error: null });
        mocks.insert.mockResolvedValue({ error: null });
    });

    it("returns an empty achievements view for signed-out users", async () => {
        const { result } = renderHook(() => useAchievements());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.achievements).toEqual([]);
        expect(result.current.unlockedCount).toBe(0);
        expect(mocks.from).not.toHaveBeenCalled();
    });

    it("joins unlocked rows with the static achievement definitions", async () => {
        mocks.currentUser.value = { id: "user-1" };
        mocks.achievementsEq.mockResolvedValue({
            data: [
                {
                    achievement_id: "first-play",
                    unlocked_at: "2026-03-13T00:00:00.000Z",
                },
            ],
            error: null,
        });

        const { result } = renderHook(() => useAchievements());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.unlockedCount).toBe(1);
        expect(result.current.totalCount).toBeGreaterThanOrEqual(20);
        expect(result.current.achievements.find((achievement) => achievement.def.id === "first-play")).toMatchObject({
            unlocked: true,
            unlockedAt: "2026-03-13T00:00:00.000Z",
        });
    });

    it("checks and inserts newly unlocked achievements after score submission", async () => {
        mocks.currentUser.value = { id: "user-1" };
        mocks.achievementsEq.mockResolvedValue({ data: [], error: null });
        mocks.scoresOrder.mockResolvedValue({
            data: [
                {
                    game_mode: "practice",
                    score: 1200,
                    wpm: 55,
                    accuracy: 100,
                    is_multiplayer: false,
                    is_win: null,
                },
            ],
            error: null,
        });

        const { result } = renderHook(() => useAchievementChecker());

        let unlockedIds: string[] = [];
        await act(async () => {
            const unlocked = await result.current.checkAchievements({
                game_mode: "practice",
                score: 1200,
                wpm: 55,
                accuracy: 100,
                is_multiplayer: false,
                is_win: null,
            });
            unlockedIds = unlocked.map((achievement) => achievement.id);
        });

        expect(unlockedIds).toEqual(expect.arrayContaining([
            "first-play",
            "practice-master",
            "speed-demon-50",
            "perfect-accuracy",
            "accuracy-95-practice",
        ]));
        expect(mocks.insert).toHaveBeenCalledWith(expect.arrayContaining([
            { user_id: "user-1", achievement_id: "first-play" },
            { user_id: "user-1", achievement_id: "practice-master" },
        ]));
        expect(result.current.newlyUnlocked.map((achievement) => achievement.id)).toEqual(expect.arrayContaining([
            "first-play",
            "practice-master",
        ]));
    });
});
