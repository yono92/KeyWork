"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthContext } from "@/components/auth/AuthProvider";
import useTypingStore from "@/store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import type { LeaderboardPeriod } from "@/lib/supabase/types";
import {
    Crown,
    Flame,
    Medal,
    Swords,
    TimerReset,
    Trophy,
    UserRound,
} from "lucide-react";
import PixelAvatar from "@/components/avatar/PixelAvatar";
import {
    formatCountdown,
    getWeeklySeasonEnd,
    type SeasonLeaderboardEntry,
} from "@/lib/seasonLeaderboard";

const COMPETITIVE_MODES = [
    { id: "typing-defense", ko: "타이핑 디펜스", en: "Typing Defense" },
    { id: "dictation", ko: "받아쓰기", en: "Dictation" },
    { id: "word-chain", ko: "끝말잇기", en: "Word Chain" },
    { id: "tetris", ko: "테트리스", en: "Tetris" },
] as const;

const PERIODS: { id: LeaderboardPeriod; ko: string; en: string }[] = [
    { id: "week", ko: "이번 주", en: "This Week" },
    { id: "day", ko: "오늘", en: "Today" },
    { id: "all", ko: "전체", en: "All Time" },
];

function getModeLabel(modeId: string, ko: boolean) {
    const mode = COMPETITIVE_MODES.find((entry) => entry.id === modeId);
    return mode ? (ko ? mode.ko : mode.en) : modeId;
}

function formatRelativeDate(dateStr: string, ko: boolean) {
    const target = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - target.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) return ko ? "방금 전" : "Just now";
    if (diffHours < 24) return ko ? `${diffHours}시간 전` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return ko ? `${diffDays}일 전` : `${diffDays}d ago`;
    return target.toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
}

function PodiumCard({
    entry,
    position,
    ko,
}: {
    entry: SeasonLeaderboardEntry | undefined;
    position: 1 | 2 | 3;
    ko: boolean;
}) {
    const styles = {
        1: {
            shell: "xl:translate-y-0 border-amber-400/40 bg-amber-500/10",
            badge: "bg-amber-400 text-slate-950",
            score: "text-amber-500",
            crown: "text-amber-500",
        },
        2: {
            shell: "xl:translate-y-5 border-slate-400/35 bg-slate-500/10",
            badge: "bg-slate-300 text-slate-950",
            score: "text-slate-500",
            crown: "text-slate-400",
        },
        3: {
            shell: "xl:translate-y-8 border-orange-500/30 bg-orange-500/10",
            badge: "bg-orange-400 text-slate-950",
            score: "text-orange-500",
            crown: "text-orange-500",
        },
    }[position];

    return (
        <div className={`rounded-[24px] border p-4 transition-transform ${styles.shell}`}>
            <div className="flex items-start justify-between gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${styles.badge}`}>
                    {position}
                </div>
                <Crown className={`h-5 w-5 ${styles.crown}`} />
            </div>
            {entry ? (
                <>
                    <div className="mt-4 flex items-center gap-3">
                        <div className="rounded-[18px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] p-2">
                            <PixelAvatar
                                config={entry.avatar_config}
                                nickname={entry.nickname}
                                size="lg"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-lg font-black text-[var(--retro-text)]">
                                {entry.nickname}
                            </p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                #{entry.rank} · {formatRelativeDate(entry.created_at, ko)}
                            </p>
                        </div>
                    </div>
                    <p className={`mt-4 text-3xl font-black leading-none ${styles.score}`}>
                        {entry.score.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-[var(--retro-text)]/55">
                        {ko ? "시즌 최고 점수" : "Best season score"}
                    </p>
                </>
            ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 p-5 text-center">
                    <p className="text-sm font-semibold text-[var(--retro-text)]/40">
                        {ko ? "아직 빈 자리" : "Open podium"}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function LeaderboardPage() {
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const { user } = useAuthContext();
    const ko = language === "korean";
    const rounded = retroTheme === "mac-classic";

    const [selectedMode, setSelectedMode] = useState<string>("typing-defense");
    const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>("week");
    const [tick, setTick] = useState(() => new Date());

    const { entries, loading, summary } = useLeaderboard(selectedMode, selectedPeriod, user?.id ?? null);

    useEffect(() => {
        if (selectedPeriod !== "week") return;

        const timer = window.setInterval(() => {
            setTick(new Date());
        }, 1000);

        return () => window.clearInterval(timer);
    }, [selectedPeriod]);

    const seasonEnd = useMemo(() => getWeeklySeasonEnd(tick), [tick]);
    const countdown = useMemo(() => formatCountdown(seasonEnd, tick), [seasonEnd, tick]);
    const topThree = entries.slice(0, 3);
    const podiumOrder: (1 | 2 | 3)[] = [2, 1, 3];
    const periodLabel = PERIODS.find((period) => period.id === selectedPeriod);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <Header />
            <div className="relative flex-1 min-h-0 overflow-y-auto">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-80"
                    style={{
                        background:
                            "radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--retro-accent) 24%, transparent), transparent 42%), radial-gradient(circle at 90% 10%, color-mix(in srgb, #f59e0b 20%, transparent), transparent 30%)",
                    }}
                />
                <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 sm:p-4 lg:gap-5">
                    <Card className={`relative overflow-hidden ${rounded ? "rounded-[28px]" : "rounded-none"}`}>
                        <div
                            aria-hidden
                            className="absolute inset-0 opacity-90"
                            style={{
                                backgroundImage:
                                    "linear-gradient(135deg, color-mix(in srgb, var(--retro-accent) 16%, transparent), transparent 58%), radial-gradient(circle at 85% 15%, color-mix(in srgb, #f59e0b 22%, transparent) 0, transparent 20%), radial-gradient(circle at 15% 85%, color-mix(in srgb, #22c55e 14%, transparent) 0, transparent 28%)",
                            }}
                        />
                        <div className="retro-titlebar relative h-10 px-3 flex items-center justify-between border-b border-black/25">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-current" />
                                <span className="text-sm font-semibold text-current">
                                    {ko ? "주간 시즌 랭킹" : "Weekly season leaderboard"}
                                </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                                {ko ? "경쟁 허브" : "Competitive hub"}
                            </span>
                        </div>
                        <CardContent className="relative p-5 lg:p-6">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--retro-text)]/45">
                                        {ko ? "시즌 포커스" : "Season focus"}
                                    </p>
                                    <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight text-[var(--retro-text)] sm:text-4xl">
                                        {ko
                                            ? `${getModeLabel(selectedMode, true)} ${periodLabel?.ko ?? "랭킹"}`
                                            : `${getModeLabel(selectedMode, false)} ${periodLabel?.en ?? "Leaderboard"}`}
                                    </h1>
                                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--retro-text)]/65">
                                        {selectedPeriod === "week"
                                            ? ko
                                                ? "이번 주 최고 기록만 살아남습니다. 시즌이 끝나기 전에 한 번 더 기록을 밀어 올리세요."
                                                : "Only your best run survives this week. Push one more score before the season resets."
                                            : ko
                                                ? "기간별 최고 기록 기준으로 경쟁 순위를 보여 줍니다."
                                                : "Rankings are normalized by each player's best score for the selected period."}
                                    </p>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {COMPETITIVE_MODES.map((mode) => (
                                            <Button
                                                key={mode.id}
                                                variant={selectedMode === mode.id ? "secondary" : "outline"}
                                                onClick={() => setSelectedMode(mode.id)}
                                                className={`h-9 px-3 text-xs font-semibold ${rounded ? "rounded-xl" : "rounded-none"}`}
                                            >
                                                {ko ? mode.ko : mode.en}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {PERIODS.map((period) => (
                                            <Button
                                                key={period.id}
                                                variant={selectedPeriod === period.id ? "default" : "ghost"}
                                                onClick={() => setSelectedPeriod(period.id)}
                                                className={`h-8 px-3 text-[11px] font-semibold ${rounded ? "rounded-xl" : "rounded-none"}`}
                                            >
                                                {ko ? period.ko : period.en}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                                    <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                                        <div className="flex items-center gap-2">
                                            <TimerReset className="h-4 w-4 text-[var(--retro-accent)]" />
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {selectedPeriod === "week"
                                                    ? ko ? "시즌 종료까지" : "Until reset"
                                                    : ko ? "기준 기간" : "Selected period"}
                                            </p>
                                        </div>
                                        <p className="mt-2 text-2xl font-black leading-none text-[var(--retro-text)]">
                                            {selectedPeriod === "week"
                                                ? `${countdown.days}d ${String(countdown.hours).padStart(2, "0")}h`
                                                : ko ? periodLabel?.ko : periodLabel?.en}
                                        </p>
                                        <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                            {selectedPeriod === "week"
                                                ? ko
                                                    ? `${String(countdown.minutes).padStart(2, "0")}m ${String(countdown.seconds).padStart(2, "0")}s 남음`
                                                    : `${String(countdown.minutes).padStart(2, "0")}m ${String(countdown.seconds).padStart(2, "0")}s left`
                                                : ko
                                                    ? "주간 시즌은 매주 월요일 00시에 초기화됩니다."
                                                    : "Weekly seasons reset every Monday at 00:00."}
                                        </p>
                                    </div>

                                    <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                                        <div className="flex items-center gap-2">
                                            <UserRound className="h-4 w-4 text-[var(--retro-accent)]" />
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {ko ? "참가자 수" : "Players"}
                                            </p>
                                        </div>
                                        <p className="mt-2 text-3xl font-black leading-none text-[var(--retro-text)]">
                                            {summary.totalPlayers.toLocaleString()}
                                        </p>
                                        <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                            {ko ? "현재 선택한 모드와 기간 기준의 고유 플레이어 수입니다." : "Unique players in the selected mode and period."}
                                        </p>
                                    </div>

                                    <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                                        <div className="flex items-center gap-2">
                                            <Flame className="h-4 w-4 text-[var(--retro-accent)]" />
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {ko ? "내 시즌 위치" : "Your spot"}
                                            </p>
                                        </div>
                                        <p className="mt-2 text-3xl font-black leading-none text-[var(--retro-text)]">
                                            {summary.myEntry ? `#${summary.myEntry.rank}` : "—"}
                                        </p>
                                        <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                            {summary.myEntry
                                                ? ko
                                                    ? `최고 ${summary.myEntry.score.toLocaleString()}점`
                                                    : `Best ${summary.myEntry.score.toLocaleString()} pts`
                                                : ko
                                                    ? "아직 이 기간의 시즌 기록이 없습니다."
                                                    : "You have not posted a season score in this period yet."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                        <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                            <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                                <div className="flex items-center gap-2">
                                    <Medal className="h-4 w-4 text-current" />
                                    <span className="text-sm font-semibold text-current">
                                        {ko ? "시즌 포디움" : "Season podium"}
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                                    TOP 3
                                </span>
                            </div>
                            <CardContent className="p-5">
                                {loading ? (
                                    <div className="rounded-2xl border border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 p-8 text-center text-sm text-[var(--retro-text)]/50">
                                        {ko ? "시즌 포디움을 불러오는 중..." : "Loading season podium..."}
                                    </div>
                                ) : (
                                    <div className="grid gap-3 xl:grid-cols-3 xl:items-end">
                                        {podiumOrder.map((position) => (
                                            <PodiumCard
                                                key={position}
                                                position={position}
                                                entry={topThree[position - 1]}
                                                ko={ko}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                            <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                                <div className="flex items-center gap-2">
                                    <Swords className="h-4 w-4 text-current" />
                                    <span className="text-sm font-semibold text-current">
                                        {ko ? "시즌 브리프" : "Season brief"}
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                                    {ko ? "내 시야" : "Your view"}
                                </span>
                            </div>
                            <CardContent className="space-y-3 p-5">
                                <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                        {ko ? "상위권 컷" : "Top cutoff"}
                                    </p>
                                    <p className="mt-2 text-2xl font-black leading-none text-[var(--retro-text)]">
                                        {entries.length > 0 ? entries[entries.length - 1].score.toLocaleString() : "—"}
                                    </p>
                                    <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                        {ko ? "현재 TOP 10에 들어가기 위한 최소 점수입니다." : "Current minimum score required to break into the top 10."}
                                    </p>
                                </div>

                                <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                        {ko ? "내 도전 상태" : "Challenge status"}
                                    </p>
                                    <p className="mt-2 text-lg font-black leading-tight text-[var(--retro-text)]">
                                        {summary.myEntry
                                            ? ko
                                                ? `${summary.myEntry.rank}위 · ${summary.myEntry.score.toLocaleString()}점`
                                                : `#${summary.myEntry.rank} · ${summary.myEntry.score.toLocaleString()} pts`
                                            : ko
                                                ? "아직 시즌 진입 전"
                                                : "Not on the board yet"}
                                    </p>
                                    <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                        {summary.myEntry
                                            ? ko
                                                ? "이번 기간 안에 한 번 더 갱신하면 바로 순위를 밀어 올릴 수 있습니다."
                                                : "One more personal best in this period can move you up immediately."
                                            : ko
                                                ? "먼저 한 판 기록을 남겨 시즌 보드에 진입하세요."
                                                : "Post one score first to enter the season board."}
                                    </p>
                                </div>

                                <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                        {ko ? "추천 액션" : "Recommended move"}
                                    </p>
                                    <p className="mt-2 text-lg font-black leading-tight text-[var(--retro-text)]">
                                        {ko
                                            ? `${getModeLabel(selectedMode, true)} 기록 다시 갱신`
                                            : `Push ${getModeLabel(selectedMode, false)} one step higher`}
                                    </p>
                                    <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                        {ko
                                            ? "이번 주 시즌은 최고 기록만 남으니, 짧게 여러 판 시도하는 편이 유리합니다."
                                            : "Because only your best run survives this week, several quick attempts are often better than one long grind."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                        <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-current" />
                                <span className="text-sm font-semibold text-current">
                                    {ko ? "시즌 순위표" : "Season table"}
                                </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                                TOP 10
                            </span>
                        </div>
                        <CardContent className="p-5">
                            {loading ? (
                                <div className="text-center py-10 text-sm text-[var(--retro-text)]/60">
                                    {ko ? "랭킹을 집계하는 중..." : "Aggregating leaderboard..."}
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="rounded-[22px] border border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 p-8 text-center">
                                    <p className="text-sm font-semibold text-[var(--retro-text)]/50">
                                        {ko ? "아직 시즌 기록이 없습니다." : "No season records yet."}
                                    </p>
                                    <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/40">
                                        {ko ? "첫 기록을 남겨 이번 시즌 첫 보드에 올라가 보세요." : "Post the first score and take the first spot on this season board."}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-field-bg)]">
                                    <div className="grid grid-cols-[64px_minmax(0,1fr)_120px_94px] items-center gap-3 border-b border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/50">
                                        <span>{ko ? "순위" : "Rank"}</span>
                                        <span>{ko ? "플레이어" : "Player"}</span>
                                        <span className="text-right">{ko ? "점수" : "Score"}</span>
                                        <span className="text-right">{ko ? "기록 시각" : "Posted"}</span>
                                    </div>
                                    <div className="divide-y divide-[var(--retro-border-mid)]/60">
                                        {entries.map((entry) => {
                                            const isMe = user?.id === entry.user_id;
                                            const badge = entry.rank <= 3 ? ["", "🥇", "🥈", "🥉"][entry.rank] : `#${entry.rank}`;

                                            return (
                                                <div
                                                    key={`${entry.rank}-${entry.user_id}`}
                                                    className={`grid grid-cols-[64px_minmax(0,1fr)_120px_94px] items-center gap-3 px-4 py-3 text-sm ${
                                                        isMe ? "bg-[var(--retro-accent)]/10" : "bg-[var(--retro-surface-alt)]/60"
                                                    }`}
                                                >
                                                    <span className="text-sm font-black text-[var(--retro-text)]/70">
                                                        {badge}
                                                    </span>
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="rounded-[16px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] p-1.5">
                                                            <PixelAvatar
                                                                config={entry.avatar_config}
                                                                nickname={entry.nickname}
                                                                size="sm"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold text-[var(--retro-text)]">
                                                                {entry.nickname}
                                                                {isMe && (
                                                                    <span className="ml-1 text-xs font-bold text-[var(--retro-accent)]">
                                                                        ({ko ? "나" : "You"})
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-[11px] text-[var(--retro-text)]/45">
                                                                {ko ? "유저별 최고 기록 반영" : "Best score only"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-right text-base font-black tabular-nums text-[var(--retro-text)]">
                                                        {entry.score.toLocaleString()}
                                                    </span>
                                                    <span className="text-right text-[11px] font-medium text-[var(--retro-text)]/45">
                                                        {formatRelativeDate(entry.created_at, ko)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
