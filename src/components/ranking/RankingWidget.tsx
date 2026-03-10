"use client";

import React from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthContext } from "@/components/auth/AuthProvider";
import useTypingStore from "@/store/store";
import { Trophy } from "lucide-react";

interface RankingWidgetProps {
    gameMode: string;
}

export default function RankingWidget({ gameMode }: RankingWidgetProps) {
    const { entries, loading } = useLeaderboard(gameMode);
    const { user } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const ko = language === "korean";

    if (loading) {
        return (
            <div className="text-xs text-[var(--retro-text)]/60 py-2 text-center">
                {ko ? "랭킹 로딩..." : "Loading rankings..."}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="text-xs text-[var(--retro-text)]/60 py-2 text-center">
                {ko ? "아직 기록이 없습니다" : "No records yet"}
            </div>
        );
    }

    return (
        <div className="my-3 text-left">
            <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="h-3.5 w-3.5 text-[var(--retro-accent)]" />
                <span className="text-xs font-semibold text-[var(--retro-text)]">
                    TOP 10
                </span>
            </div>
            <div className="border border-[var(--retro-border-mid)] text-xs">
                {entries.map((entry) => {
                    const isMe = user?.id === entry.user_id;
                    return (
                        <div
                            key={`${entry.rank}-${entry.user_id}`}
                            className={`flex items-center gap-2 px-2 py-1 border-b border-[var(--retro-border-mid)] last:border-b-0 ${isMe ? "bg-[var(--retro-accent)]/10 font-semibold" : ""}`}
                        >
                            <span className="w-5 text-right tabular-nums text-[var(--retro-text)]/60">
                                {entry.rank}
                            </span>
                            <span className="flex-1 truncate text-[var(--retro-text)]">
                                {entry.nickname}
                                {isMe && <span className="text-[var(--retro-accent)]"> ★</span>}
                            </span>
                            <span className="tabular-nums font-medium text-[var(--retro-text)]">
                                {entry.score.toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
