"use client";

import React, { useState } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthContext } from "@/components/auth/AuthProvider";
import useTypingStore from "@/store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import type { LeaderboardPeriod } from "@/lib/supabase/types";
import { Trophy } from "lucide-react";

const GAME_MODES = [
    { id: "practice", ko: "문장연습", en: "Practice" },
    { id: "falling-words", ko: "단어낙하", en: "Falling Words" },
    { id: "word-chain", ko: "끝말잇기", en: "Word Chain" },
    { id: "typing-runner", ko: "타이핑 러너", en: "Typing Runner" },
    { id: "tetris", ko: "테트리스", en: "Tetris" },
] as const;

const PERIODS: { id: LeaderboardPeriod; ko: string; en: string }[] = [
    { id: "all", ko: "전체", en: "All Time" },
    { id: "week", ko: "이번 주", en: "This Week" },
    { id: "day", ko: "오늘", en: "Today" },
];

export default function LeaderboardPage() {
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const { user } = useAuthContext();
    const ko = language === "korean";
    const [selectedMode, setSelectedMode] = useState("practice");
    const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>("all");
    const { entries, loading } = useLeaderboard(selectedMode, selectedPeriod);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
                <Card className={`max-w-2xl mx-auto ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
                    <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                        <Trophy className="h-4 w-4 text-current" />
                        <span className="text-sm font-semibold text-current">
                            {ko ? "랭킹" : "Leaderboard"}
                        </span>
                    </div>
                    <CardContent className="p-4">
                        {/* 게임 모드 탭 */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {GAME_MODES.map((mode) => (
                                <Button
                                    key={mode.id}
                                    variant={selectedMode === mode.id ? "default" : "outline"}
                                    onClick={() => setSelectedMode(mode.id)}
                                    className={`text-xs px-3 py-1 h-7 ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                                >
                                    {ko ? mode.ko : mode.en}
                                </Button>
                            ))}
                        </div>

                        {/* 기간 탭 */}
                        <div className="flex gap-1 mb-4">
                            {PERIODS.map((p) => (
                                <Button
                                    key={p.id}
                                    variant={selectedPeriod === p.id ? "default" : "ghost"}
                                    onClick={() => setSelectedPeriod(p.id)}
                                    className={`text-xs px-2.5 py-1 h-6 ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                                >
                                    {ko ? p.ko : p.en}
                                </Button>
                            ))}
                        </div>

                        {/* 랭킹 리스트 */}
                        {loading ? (
                            <div className="text-center py-8 text-sm text-[var(--retro-text)]/60">
                                {ko ? "로딩 중..." : "Loading..."}
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="text-center py-8 text-sm text-[var(--retro-text)]/60">
                                {ko ? "아직 기록이 없습니다" : "No records yet"}
                            </div>
                        ) : (
                            <div className="border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] bg-[var(--retro-field-bg)]">
                                {/* 헤더 */}
                                <div className="flex items-center px-3 py-2 text-xs font-semibold text-[var(--retro-text)]/70 border-b-2 border-[var(--retro-border-mid)] bg-[var(--retro-surface)]">
                                    <span className="w-10">#</span>
                                    <span className="flex-1">{ko ? "닉네임" : "Player"}</span>
                                    <span className="w-20 text-right">{ko ? "점수" : "Score"}</span>
                                </div>
                                {entries.map((entry) => {
                                    const isMe = user?.id === entry.user_id;
                                    return (
                                        <div
                                            key={`${entry.rank}-${entry.user_id}`}
                                            className={`flex items-center px-3 py-2 text-sm border-b border-[var(--retro-border-mid)]/50 last:border-b-0 ${isMe ? "bg-[var(--retro-accent)]/10" : ""}`}
                                        >
                                            <span className="w-10 tabular-nums font-bold text-[var(--retro-text)]/60">
                                                {entry.rank <= 3
                                                    ? ["", "🥇", "🥈", "🥉"][entry.rank]
                                                    : entry.rank}
                                            </span>
                                            <span className="flex-1 truncate font-medium text-[var(--retro-text)]">
                                                {entry.nickname}
                                                {isMe && (
                                                    <span className="ml-1 text-xs text-[var(--retro-accent)]">
                                                        ({ko ? "나" : "You"})
                                                    </span>
                                                )}
                                            </span>
                                            <span className="w-20 text-right tabular-nums font-bold text-[var(--retro-text)]">
                                                {entry.score.toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
