import { describe, expect, it } from "vitest";
import {
    ACHIEVEMENTS,
    getNewlyUnlockedAchievements,
    type AchievementCheckContext,
} from "@/data/achievements";

function createContext(overrides?: Partial<AchievementCheckContext>): AchievementCheckContext {
    return {
        currentScore: {
            game_mode: "practice",
            score: 1200,
            wpm: 102,
            accuracy: 100,
            is_multiplayer: false,
            is_win: null,
        },
        allScores: [
            {
                game_mode: "practice",
                score: 1200,
                wpm: 102,
                accuracy: 100,
                is_multiplayer: false,
                is_win: null,
            },
            {
                game_mode: "falling-words",
                score: 5200,
                wpm: null,
                accuracy: null,
                is_multiplayer: false,
                is_win: null,
            },
            {
                game_mode: "word-chain",
                score: 3100,
                wpm: null,
                accuracy: null,
                is_multiplayer: true,
                is_win: true,
            },
        ],
        ...overrides,
    };
}

describe("achievements definitions", () => {
    it("keeps a broad, unique achievement catalog", () => {
        const ids = ACHIEVEMENTS.map((achievement) => achievement.id);

        expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("finds only achievements that are newly unlocked", () => {
        const unlocked = new Set(["first-play", "perfect-accuracy"]);
        const result = getNewlyUnlockedAchievements(createContext(), unlocked);
        const ids = result.map((achievement) => achievement.id);

        expect(ids).toContain("practice-master");
        expect(ids).toContain("speed-demon-100");
        expect(ids).toContain("accuracy-95-practice");
        expect(ids).toContain("try-3-modes");
        expect(ids).toContain("mp-first-win");
        expect(ids).not.toContain("first-play");
        expect(ids).not.toContain("perfect-accuracy");
    });

    it("unlocks all-rounder only after every game mode has been played", () => {
        const missingModeContext = createContext();
        const completeContext = createContext({
            allScores: [
                ...createContext().allScores,
                { game_mode: "typing-runner", score: 2100, wpm: 88, accuracy: 97, is_multiplayer: false, is_win: null },
                { game_mode: "tetris", score: 12000, wpm: null, accuracy: null, is_multiplayer: false, is_win: null },
            ],
        });

        expect(
            getNewlyUnlockedAchievements(missingModeContext, new Set()).some((achievement) => achievement.id === "try-all-modes"),
        ).toBe(false);
        expect(
            getNewlyUnlockedAchievements(completeContext, new Set()).some((achievement) => achievement.id === "try-all-modes"),
        ).toBe(true);
    });
});
