"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { GameMode } from "@/lib/supabase/types";

// DB GameMode (game_scores 테이블에 저장되는 모드)
const GAME_MODES: GameMode[] = [
    "practice",
    "falling-words",
    "word-chain",
    "typing-race",
    "typing-defense",
    "dictation",
];

const MODE_LABELS_KO: Record<GameMode, string> = {
    practice: "문장연습",
    "falling-words": "단어낙하",
    "word-chain": "끝말잇기",
    "typing-race": "타이핑 레이스",
    "typing-defense": "타이핑 디펜스",
    dictation: "받아쓰기",
};

const MODE_LABELS_EN: Record<GameMode, string> = {
    practice: "Practice",
    "falling-words": "Falling Words",
    "word-chain": "Word Chain",
    "typing-race": "Typing Race",
    "typing-defense": "Typing Defense",
    dictation: "Dictation",
};

export function getModeLabel(mode: GameMode, ko: boolean): string {
    return ko ? MODE_LABELS_KO[mode] : MODE_LABELS_EN[mode];
}

export interface ModeStats {
    mode: GameMode;
    bestScore: number;
    playCount: number;
    avgAccuracy: number | null; // null이면 정확도 데이터 없음
}

export interface MultiplayerRecord {
    wins: number;
    losses: number;
    total: number;
    winRate: number; // 0~100
}

export interface RecentMatch {
    id: number;
    gameMode: GameMode;
    score: number;
    accuracy: number | null;
    wpm: number | null;
    isMultiplayer: boolean;
    isWin: boolean | null;
    createdAt: string;
}

export interface UserStats {
    totalPlays: number;
    modeStats: ModeStats[];
    multiplayer: MultiplayerRecord;
    mostPlayedMode: GameMode | null;
    recentMatches: RecentMatch[];
}

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

            // 모든 game_scores를 한 번에 가져와서 클라이언트에서 집계
            // idx_scores_user 인덱스 활용
            const { data: scores, error } = await supabase
                .from("game_scores")
                .select("id, game_mode, score, accuracy, wpm, is_multiplayer, is_win, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const allScores = scores ?? [];

            // 모드별 집계
            const modeStats: ModeStats[] = GAME_MODES.map((mode) => {
                const modeScores = allScores.filter((s) => s.game_mode === mode);
                const accuracies = modeScores
                    .map((s) => s.accuracy)
                    .filter((a): a is number => a != null);

                return {
                    mode,
                    bestScore: modeScores.length > 0 ? Math.max(...modeScores.map((s) => s.score)) : 0,
                    playCount: modeScores.length,
                    avgAccuracy:
                        accuracies.length > 0
                            ? Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 10) / 10
                            : null,
                };
            });

            // 멀티플레이 전적
            const mpScores = allScores.filter((s) => s.is_multiplayer);
            const wins = mpScores.filter((s) => s.is_win === true).length;
            const losses = mpScores.filter((s) => s.is_win === false).length;
            const mpTotal = mpScores.length;

            // 가장 많이 플레이한 모드
            const played = modeStats.filter((m) => m.playCount > 0);
            const mostPlayed = played.length > 0
                ? played.reduce((a, b) => (a.playCount >= b.playCount ? a : b)).mode
                : null;

            // 최근 10건
            const recentMatches: RecentMatch[] = allScores.slice(0, 10).map((s) => ({
                id: s.id,
                gameMode: s.game_mode as GameMode,
                score: s.score,
                accuracy: s.accuracy,
                wpm: s.wpm,
                isMultiplayer: s.is_multiplayer,
                isWin: s.is_win,
                createdAt: s.created_at,
            }));

            setStats({
                totalPlays: allScores.length,
                modeStats,
                multiplayer: {
                    wins,
                    losses,
                    total: mpTotal,
                    winRate: mpTotal > 0 ? Math.round((wins / mpTotal) * 100) : 0,
                },
                mostPlayedMode: mostPlayed,
                recentMatches,
            });
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
