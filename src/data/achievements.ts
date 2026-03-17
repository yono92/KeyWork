import type { GameMode } from "@/lib/supabase/types";

// ── 업적 검사에 사용되는 컨텍스트 ──

export interface AchievementCheckContext {
    /** 방금 제출한 점수 */
    currentScore: {
        game_mode: string;
        score: number;
        wpm?: number | null;
        accuracy?: number | null;
        is_multiplayer?: boolean;
        is_win?: boolean | null;
    };
    /** 유저의 전체 game_scores (최신순) */
    allScores: {
        game_mode: string;
        score: number;
        wpm: number | null;
        accuracy: number | null;
        is_multiplayer: boolean;
        is_win: boolean | null;
    }[];
}

// ── 업적 카테고리 ──

export type AchievementCategory =
    | "beginner"
    | "mode-master"
    | "record"
    | "grinder"
    | "multiplayer";

const CATEGORY_LABELS = {
    beginner: { ko: "입문", en: "Beginner" },
    "mode-master": { ko: "모드 마스터", en: "Mode Master" },
    record: { ko: "기록 달성", en: "Records" },
    grinder: { ko: "다작", en: "Grinder" },
    multiplayer: { ko: "멀티플레이", en: "Multiplayer" },
} as const;

export function getCategoryLabel(cat: AchievementCategory, ko: boolean): string {
    return ko ? CATEGORY_LABELS[cat].ko : CATEGORY_LABELS[cat].en;
}

// ── 업적 정의 ──

export interface AchievementDef {
    id: string;
    category: AchievementCategory;
    icon: string;
    name: { ko: string; en: string };
    description: { ko: string; en: string };
    check: (ctx: AchievementCheckContext) => boolean;
}

// 헬퍼
function countByMode(scores: AchievementCheckContext["allScores"], mode: string) {
    return scores.filter((s) => s.game_mode === mode).length;
}

function bestScoreByMode(scores: AchievementCheckContext["allScores"], mode: string) {
    const modeScores = scores.filter((s) => s.game_mode === mode);
    return modeScores.length > 0 ? Math.max(...modeScores.map((s) => s.score)) : 0;
}

function totalPlays(scores: AchievementCheckContext["allScores"]) {
    return scores.length;
}

function mpWins(scores: AchievementCheckContext["allScores"]) {
    return scores.filter((s) => s.is_multiplayer && s.is_win === true).length;
}

function mpTotal(scores: AchievementCheckContext["allScores"]) {
    return scores.filter((s) => s.is_multiplayer).length;
}

function bestAccuracyByMode(scores: AchievementCheckContext["allScores"], mode: string) {
    const accs = scores
        .filter((s) => s.game_mode === mode && s.accuracy != null)
        .map((s) => s.accuracy!);
    return accs.length > 0 ? Math.max(...accs) : 0;
}

function bestWpm(scores: AchievementCheckContext["allScores"]) {
    const wpms = scores.filter((s) => s.wpm != null).map((s) => s.wpm!);
    return wpms.length > 0 ? Math.max(...wpms) : 0;
}

const ALL_GAME_MODES: GameMode[] = [
    "practice", "falling-words", "word-chain", "typing-runner", "tetris",
];

export const ACHIEVEMENTS: AchievementDef[] = [
    // ── 입문 ──
    {
        id: "first-play",
        category: "beginner",
        icon: "🎮",
        name: { ko: "첫 걸음", en: "First Steps" },
        description: { ko: "첫 게임을 플레이했습니다", en: "Played your first game" },
        check: (ctx) => totalPlays(ctx.allScores) >= 1,
    },
    {
        id: "try-3-modes",
        category: "beginner",
        icon: "🎯",
        name: { ko: "탐험가", en: "Explorer" },
        description: { ko: "3가지 모드를 플레이했습니다", en: "Played 3 different modes" },
        check: (ctx) => {
            const modes = new Set(ctx.allScores.map((s) => s.game_mode));
            return modes.size >= 3;
        },
    },
    {
        id: "try-all-modes",
        category: "beginner",
        icon: "🌟",
        name: { ko: "올라운더", en: "All-Rounder" },
        description: { ko: "모든 모드를 플레이했습니다", en: "Played every mode" },
        check: (ctx) => {
            const modes = new Set(ctx.allScores.map((s) => s.game_mode));
            return ALL_GAME_MODES.every((m) => modes.has(m));
        },
    },

    // ── 모드 마스터 ──
    {
        id: "practice-master",
        category: "mode-master",
        icon: "📝",
        name: { ko: "문장연습 달인", en: "Practice Master" },
        description: { ko: "문장연습에서 1,000점 달성", en: "Score 1,000 in Practice" },
        check: (ctx) => bestScoreByMode(ctx.allScores, "practice") >= 1000,
    },
    {
        id: "falling-master",
        category: "mode-master",
        icon: "🌧️",
        name: { ko: "단어낙하 달인", en: "Falling Words Master" },
        description: { ko: "단어낙하에서 5,000점 달성", en: "Score 5,000 in Falling Words" },
        check: (ctx) => bestScoreByMode(ctx.allScores, "falling-words") >= 5000,
    },
    {
        id: "chain-master",
        category: "mode-master",
        icon: "🔗",
        name: { ko: "끝말잇기 달인", en: "Word Chain Master" },
        description: { ko: "끝말잇기에서 3,000점 달성", en: "Score 3,000 in Word Chain" },
        check: (ctx) => bestScoreByMode(ctx.allScores, "word-chain") >= 3000,
    },
    {
        id: "race-master",
        category: "mode-master",
        icon: "🏎️",
        name: { ko: "레이스 달인", en: "Race Master" },
        description: { ko: "타이핑 레이스에서 2,000점 달성", en: "Score 2,000 in Typing Race" },
        check: (ctx) => bestScoreByMode(ctx.allScores, "typing-race") >= 2000,
    },
    // ── 기록 달성 ──
    {
        id: "speed-demon-50",
        category: "record",
        icon: "⚡",
        name: { ko: "스피드 데몬", en: "Speed Demon" },
        description: { ko: "WPM 50 이상 달성", en: "Reach 50+ WPM" },
        check: (ctx) => bestWpm(ctx.allScores) >= 50,
    },
    {
        id: "speed-demon-100",
        category: "record",
        icon: "🔥",
        name: { ko: "번개 손가락", en: "Lightning Fingers" },
        description: { ko: "WPM 100 이상 달성", en: "Reach 100+ WPM" },
        check: (ctx) => bestWpm(ctx.allScores) >= 100,
    },
    {
        id: "speed-demon-150",
        category: "record",
        icon: "💥",
        name: { ko: "음속 돌파", en: "Sonic Typist" },
        description: { ko: "WPM 150 이상 달성", en: "Reach 150+ WPM" },
        check: (ctx) => bestWpm(ctx.allScores) >= 150,
    },
    {
        id: "perfect-accuracy",
        category: "record",
        icon: "💯",
        name: { ko: "완벽주의자", en: "Perfectionist" },
        description: { ko: "정확도 100%로 게임 완료", en: "Complete a game with 100% accuracy" },
        check: (ctx) => ctx.currentScore.accuracy === 100,
    },
    {
        id: "accuracy-95-practice",
        category: "record",
        icon: "🎯",
        name: { ko: "정밀 타자", en: "Precision Typist" },
        description: { ko: "문장연습에서 정확도 95% 이상 달성", en: "95%+ accuracy in Practice" },
        check: (ctx) => bestAccuracyByMode(ctx.allScores, "practice") >= 95,
    },
    {
        id: "high-score-10k",
        category: "record",
        icon: "🏆",
        name: { ko: "만점 클럽", en: "10K Club" },
        description: { ko: "어떤 모드에서든 10,000점 달성", en: "Score 10,000 in any mode" },
        check: (ctx) => ctx.allScores.some((s) => s.score >= 10000),
    },

    // ── 다작 ──
    {
        id: "plays-10",
        category: "grinder",
        icon: "🔰",
        name: { ko: "워밍업", en: "Warming Up" },
        description: { ko: "총 10회 플레이", en: "Play 10 games total" },
        check: (ctx) => totalPlays(ctx.allScores) >= 10,
    },
    {
        id: "plays-50",
        category: "grinder",
        icon: "🎖️",
        name: { ko: "꾸준한 타자", en: "Steady Typist" },
        description: { ko: "총 50회 플레이", en: "Play 50 games total" },
        check: (ctx) => totalPlays(ctx.allScores) >= 50,
    },
    {
        id: "plays-100",
        category: "grinder",
        icon: "🏅",
        name: { ko: "백전노장", en: "Veteran" },
        description: { ko: "총 100회 플레이", en: "Play 100 games total" },
        check: (ctx) => totalPlays(ctx.allScores) >= 100,
    },
    {
        id: "plays-500",
        category: "grinder",
        icon: "👑",
        name: { ko: "타이핑 중독", en: "Typing Addict" },
        description: { ko: "총 500회 플레이", en: "Play 500 games total" },
        check: (ctx) => totalPlays(ctx.allScores) >= 500,
    },
    {
        id: "mode-10-practice",
        category: "grinder",
        icon: "📖",
        name: { ko: "연습벌레", en: "Practice Bug" },
        description: { ko: "문장연습 10회 플레이", en: "Play Practice 10 times" },
        check: (ctx) => countByMode(ctx.allScores, "practice") >= 10,
    },
    // ── 멀티플레이 ──
    {
        id: "mp-first-win",
        category: "multiplayer",
        icon: "⚔️",
        name: { ko: "첫 승리", en: "First Victory" },
        description: { ko: "멀티플레이에서 첫 승리", en: "Win your first multiplayer match" },
        check: (ctx) => mpWins(ctx.allScores) >= 1,
    },
    {
        id: "mp-5-wins",
        category: "multiplayer",
        icon: "🗡️",
        name: { ko: "파이터", en: "Fighter" },
        description: { ko: "멀티플레이 5승 달성", en: "Win 5 multiplayer matches" },
        check: (ctx) => mpWins(ctx.allScores) >= 5,
    },
    {
        id: "mp-20-wins",
        category: "multiplayer",
        icon: "🏟️",
        name: { ko: "챔피언", en: "Champion" },
        description: { ko: "멀티플레이 20승 달성", en: "Win 20 multiplayer matches" },
        check: (ctx) => mpWins(ctx.allScores) >= 20,
    },
    {
        id: "mp-10-matches",
        category: "multiplayer",
        icon: "🤝",
        name: { ko: "대전 매니아", en: "Battle Maniac" },
        description: { ko: "멀티플레이 10회 참가", en: "Participate in 10 multiplayer matches" },
        check: (ctx) => mpTotal(ctx.allScores) >= 10,
    },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getNewlyUnlockedAchievements(
    ctx: AchievementCheckContext,
    unlockedIds: ReadonlySet<string>,
) {
    return ACHIEVEMENTS.filter((achievement) => (
        !unlockedIds.has(achievement.id) && achievement.check(ctx)
    ));
}
