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
    rewardXp: number;
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
    todayXp: number;
    todayMissionXp: number;
}

export interface ProgressionSummary {
    level: number;
    totalXp: number;
    playXp: number;
    missionXp: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progressPercent: number;
    currentLevelStartXp: number;
    nextLevelTotalXp: number;
    todayXp: number;
    todayMissionXp: number;
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
    progression: ProgressionSummary;
}

const XP_PER_PLAY = 20;
const XP_MULTIPLAYER_BONUS = 10;
const XP_WIN_BONUS = 15;
const XP_ACCURACY_BONUS = 5;

const DAILY_MISSION_REWARDS = {
    plays: 30,
    modes: 40,
    multiplayer: 50,
} as const;

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

interface DaySnapshot {
    playCount: number;
    multiplayerCount: number;
    modes: Set<string>;
}

function buildDaySnapshots(scores: readonly ScoreStatRow[]) {
    const snapshots = new Map<string, DaySnapshot>();

    for (const score of scores) {
        const dayKey = toDayKey(score.created_at);
        const snapshot = snapshots.get(dayKey) ?? {
            playCount: 0,
            multiplayerCount: 0,
            modes: new Set<string>(),
        };

        snapshot.playCount += 1;
        snapshot.modes.add(score.game_mode);
        if (score.is_multiplayer) snapshot.multiplayerCount += 1;
        snapshots.set(dayKey, snapshot);
    }

    return snapshots;
}

function buildDailyMissions(snapshot: DaySnapshot | undefined): DailyMissionSummary[] {
    const playCount = snapshot?.playCount ?? 0;
    const uniqueModes = snapshot?.modes.size ?? 0;
    const multiplayerCount = snapshot?.multiplayerCount ?? 0;

    return [
        {
            id: "plays",
            current: playCount,
            target: 3,
            completed: playCount >= 3,
            rewardXp: DAILY_MISSION_REWARDS.plays,
        },
        {
            id: "modes",
            current: uniqueModes,
            target: 2,
            completed: uniqueModes >= 2,
            rewardXp: DAILY_MISSION_REWARDS.modes,
        },
        {
            id: "multiplayer",
            current: multiplayerCount,
            target: 1,
            completed: multiplayerCount >= 1,
            rewardXp: DAILY_MISSION_REWARDS.multiplayer,
        },
    ];
}

function getScoreXp(score: ScoreStatRow) {
    return XP_PER_PLAY
        + (score.is_multiplayer ? XP_MULTIPLAYER_BONUS : 0)
        + (score.is_win ? XP_WIN_BONUS : 0)
        + ((score.accuracy ?? 0) >= 95 ? XP_ACCURACY_BONUS : 0);
}

function getXpRequiredForLevel(level: number) {
    return 100 + (level - 1) * 50;
}

function buildProgressionSummary(scores: readonly ScoreStatRow[], daySnapshots: ReadonlyMap<string, DaySnapshot>): ProgressionSummary {
    const playXp = scores.reduce((sum, score) => sum + getScoreXp(score), 0);
    const missionXp = [...daySnapshots.values()].reduce((sum, snapshot) => (
        sum + buildDailyMissions(snapshot)
            .filter((mission) => mission.completed)
            .reduce((inner, mission) => inner + mission.rewardXp, 0)
    ), 0);

    const totalXp = playXp + missionXp;
    let level = 1;
    let currentLevelStartXp = 0;
    let nextLevelXp = getXpRequiredForLevel(level);
    let remainingXp = totalXp;

    while (remainingXp >= nextLevelXp) {
        remainingXp -= nextLevelXp;
        currentLevelStartXp += nextLevelXp;
        level += 1;
        nextLevelXp = getXpRequiredForLevel(level);
    }

    const todayKey = toDayKey(new Date());
    const todaySnapshot = daySnapshots.get(todayKey);
    const todayPlayXp = scores
        .filter((score) => toDayKey(score.created_at) === todayKey)
        .reduce((sum, score) => sum + getScoreXp(score), 0);
    const todayMissionXp = buildDailyMissions(todaySnapshot)
        .filter((mission) => mission.completed)
        .reduce((sum, mission) => sum + mission.rewardXp, 0);

    return {
        level,
        totalXp,
        playXp,
        missionXp,
        currentLevelXp: remainingXp,
        nextLevelXp,
        progressPercent: nextLevelXp > 0 ? Math.round((remainingXp / nextLevelXp) * 100) : 0,
        currentLevelStartXp,
        nextLevelTotalXp: currentLevelStartXp + nextLevelXp,
        todayXp: todayPlayXp + todayMissionXp,
        todayMissionXp,
    };
}

function buildActivitySummary(scores: readonly ScoreStatRow[]): ActivitySummary {
    const daySnapshots = buildDaySnapshots(scores);
    const dayCounts = new Map(
        [...daySnapshots.entries()].map(([key, snapshot]) => [key, snapshot.playCount]),
    );
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

    const todaySnapshot = daySnapshots.get(todayKey);
    const dailyMissions = buildDailyMissions(todaySnapshot);
    const todayMissionXp = dailyMissions
        .filter((mission) => mission.completed)
        .reduce((sum, mission) => sum + mission.rewardXp, 0);
    const todayPlayXp = scores
        .filter((score) => toDayKey(score.created_at) === todayKey)
        .reduce((sum, score) => sum + getScoreXp(score), 0);

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
        todayXp: todayPlayXp + todayMissionXp,
        todayMissionXp,
    };
}

export function aggregateUserStats(
    scores: readonly ScoreStatRow[],
    displayModes: readonly string[],
): AggregatedUserStats {
    const daySnapshots = buildDaySnapshots(scores);
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
        progression: buildProgressionSummary(scores, daySnapshots),
    };
}
