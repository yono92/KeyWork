"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { ACHIEVEMENTS } from "@/data/achievements";
import type { AchievementDef, AchievementCheckContext } from "@/data/achievements";

export function useAchievementChecker() {
    const { user } = useAuthContext();
    const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDef[]>([]);
    const [checking, setChecking] = useState(false);

    const checkAchievements = useCallback(
        async (currentScore: AchievementCheckContext["currentScore"]) => {
            if (!user) return [];

            setChecking(true);
            try {
                const supabase = createClient();

                // 병렬: 기존 해금 목록 + 전체 점수 조회
                const [achievementsRes, scoresRes] = await Promise.all([
                    supabase
                        .from("user_achievements")
                        .select("achievement_id")
                        .eq("user_id", user.id),
                    supabase
                        .from("game_scores")
                        .select("game_mode, score, wpm, accuracy, is_multiplayer, is_win")
                        .eq("user_id", user.id)
                        .order("created_at", { ascending: false }),
                ]);

                if (achievementsRes.error || scoresRes.error) return [];

                const unlockedSet = new Set(
                    (achievementsRes.data ?? []).map((a) => a.achievement_id),
                );

                const ctx: AchievementCheckContext = {
                    currentScore,
                    allScores: (scoresRes.data ?? []).map((s) => ({
                        game_mode: s.game_mode,
                        score: s.score,
                        wpm: s.wpm,
                        accuracy: s.accuracy,
                        is_multiplayer: s.is_multiplayer,
                        is_win: s.is_win,
                    })),
                };

                // 미해금 + 조건 충족인 업적 필터
                const newly = ACHIEVEMENTS.filter(
                    (a) => !unlockedSet.has(a.id) && a.check(ctx),
                );

                if (newly.length > 0) {
                    // 일괄 INSERT (UNIQUE 제약으로 중복 방지)
                    await supabase.from("user_achievements").insert(
                        newly.map((a) => ({
                            user_id: user.id,
                            achievement_id: a.id,
                        })),
                    );
                }

                setNewlyUnlocked(newly);
                return newly;
            } catch {
                return [];
            } finally {
                setChecking(false);
            }
        },
        [user],
    );

    const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

    return { checkAchievements, newlyUnlocked, clearNewlyUnlocked, checking };
}
