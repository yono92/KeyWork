export interface ScoreStatRow {
    id: number;
    game_mode: string;
    score: number;
    accuracy: number | null;
    wpm: number | null;
    is_multiplayer: boolean;
    is_win: boolean | null;
    created_at: string;
}

export interface ModeStatsSummary {
    mode: string;
    bestScore: number;
    playCount: number;
    avgAccuracy: number | null;
}

export interface RecentMatchSummary {
    id: number;
    gameMode: string;
    score: number;
    accuracy: number | null;
    wpm: number | null;
    isMultiplayer: boolean;
    isWin: boolean | null;
    createdAt: string;
}

export interface DailyMissionSummary {
    id: "plays" | "modes" | "multiplayer";
    current: number;
    target: number;
    completed: boolean;
}

export interface StreakDaySummary {
    key: string;
    label: string;
    played: boolean;
    playCount: number;
}

export interface ActivitySummary {
    currentStreak: number;
    longestStreak: number;
    activeToday: boolean;
    recentDays: StreakDaySummary[];
    dailyMissions: DailyMissionSummary[];
    completedMissionCount: number;
}

export interface AggregatedUserStats {
    totalPlays: number;
    modeStats: ModeStatsSummary[];
    multiplayer: {
        wins: number;
        losses: number;
        total: number;
        winRate: number;
    };
    mostPlayedMode: string | null;
    recentMatches: RecentMatchSummary[];
    activity: ActivitySummary;
}

function toDayKey(dateValue: string | Date) {
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(baseDate: Date, amount: number) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + amount);
    return next;
}

function buildActivitySummary(scores: readonly ScoreStatRow[]): ActivitySummary {
    const dayCounts = new Map<string, number>();

    for (const score of scores) {
        const dayKey = toDayKey(score.created_at);
        dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    }

    const sortedKeys = [...dayCounts.keys()].sort();
    const today = new Date();
    const todayKey = toDayKey(today);
    const activeToday = dayCounts.has(todayKey);

    let longestStreak = 0;
    let currentRun = 0;
    let previousDay: Date | null = null;

    for (const key of sortedKeys) {
        const currentDay = new Date(`${key}T00:00:00`);

        if (!previousDay) {
            currentRun = 1;
        } else {
            const diffDays = Math.round((currentDay.getTime() - previousDay.getTime()) / 86400000);
            currentRun = diffDays === 1 ? currentRun + 1 : 1;
        }

        longestStreak = Math.max(longestStreak, currentRun);
        previousDay = currentDay;
    }

    let currentStreak = 0;
    if (sortedKeys.length > 0) {
        let cursor = new Date(`${sortedKeys[sortedKeys.length - 1]}T00:00:00`);
        currentStreak = 1;

        for (let i = sortedKeys.length - 2; i >= 0; i -= 1) {
            cursor = addDays(cursor, -1);
            if (toDayKey(cursor) !== sortedKeys[i]) break;
            currentStreak += 1;
        }
    }

    const todayScores = scores.filter((score) => toDayKey(score.created_at) === todayKey);
    const uniqueModesToday = new Set(todayScores.map((score) => score.game_mode)).size;
    const multiplayerToday = todayScores.filter((score) => score.is_multiplayer).length;

    const dailyMissions: DailyMissionSummary[] = [
        {
            id: "plays",
            current: todayScores.length,
            target: 3,
            completed: todayScores.length >= 3,
        },
        {
            id: "modes",
            current: uniqueModesToday,
            target: 2,
            completed: uniqueModesToday >= 2,
        },
        {
            id: "multiplayer",
            current: multiplayerToday,
            target: 1,
            completed: multiplayerToday >= 1,
        },
    ];

    const recentDays = Array.from({ length: 7 }, (_, index) => {
        const day = addDays(today, index - 6);
        const key = toDayKey(day);
        return {
            key,
            label: day.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
            played: dayCounts.has(key),
            playCount: dayCounts.get(key) ?? 0,
        };
    });

    return {
        currentStreak,
        longestStreak,
        activeToday,
        recentDays,
        dailyMissions,
        completedMissionCount: dailyMissions.filter((mission) => mission.completed).length,
    };
}

export function aggregateUserStats(
    scores: readonly ScoreStatRow[],
    displayModes: readonly string[],
): AggregatedUserStats {
    const modeStats: ModeStatsSummary[] = displayModes.map((mode) => {
        const modeScores = scores.filter((score) => score.game_mode === mode);
        const accuracies = modeScores
            .map((score) => score.accuracy)
            .filter((accuracy): accuracy is number => accuracy != null);

        return {
            mode,
            bestScore: modeScores.length > 0 ? Math.max(...modeScores.map((score) => score.score)) : 0,
            playCount: modeScores.length,
            avgAccuracy:
                accuracies.length > 0
                    ? Math.round((accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length) * 10) / 10
                    : null,
        };
    });

    const multiplayerScores = scores.filter((score) => score.is_multiplayer);
    const wins = multiplayerScores.filter((score) => score.is_win === true).length;
    const losses = multiplayerScores.filter((score) => score.is_win === false).length;
    const totalMultiplayer = multiplayerScores.length;
    const playedModes = modeStats.filter((mode) => mode.playCount > 0);
    const mostPlayedMode = playedModes.length > 0
        ? playedModes.reduce((best, current) => (best.playCount >= current.playCount ? best : current)).mode
        : null;

    return {
        totalPlays: scores.length,
        modeStats,
        multiplayer: {
            wins,
            losses,
            total: totalMultiplayer,
            winRate: totalMultiplayer > 0 ? Math.round((wins / totalMultiplayer) * 100) : 0,
        },
        mostPlayedMode,
        recentMatches: scores.slice(0, 10).map((score) => ({
            id: score.id,
            gameMode: score.game_mode,
            score: score.score,
            accuracy: score.accuracy,
            wpm: score.wpm,
            isMultiplayer: score.is_multiplayer,
            isWin: score.is_win,
            createdAt: score.created_at,
        })),
        activity: buildActivitySummary(scores),
    };
}
