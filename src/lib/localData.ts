import type { CustomText, LocalScore, LocalScoreInput } from "@/types/domain";

export const LOCAL_DATA_KEYS = {
    customTexts: "keywork.customTexts.v1",
    scores: "keywork.scores.v1",
} as const;

const canUseStorage = () => typeof window !== "undefined";
const GAME_MODES = new Set(["practice", "falling-words", "word-chain", "typing-runner", "tetris"]);

function readJson(key: string): unknown {
    if (!canUseStorage()) return null;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeJson(key: string, value: unknown): boolean {
    if (!canUseStorage()) return false;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function isCustomText(value: unknown): value is CustomText {
    if (!value || typeof value !== "object") return false;
    const text = value as Record<string, unknown>;
    return typeof text.id === "number"
        && typeof text.title === "string"
        && typeof text.content === "string"
        && (text.language === "korean" || text.language === "english")
        && typeof text.created_at === "string"
        && typeof text.updated_at === "string";
}

export function loadCustomTexts(): CustomText[] {
    const value = readJson(LOCAL_DATA_KEYS.customTexts);
    return Array.isArray(value) ? value.filter(isCustomText) : [];
}

export function saveCustomTexts(texts: CustomText[]) {
    return writeJson(LOCAL_DATA_KEYS.customTexts, texts.slice(0, 200));
}

function isLocalScore(value: unknown): value is LocalScore {
    if (!value || typeof value !== "object") return false;
    const score = value as Record<string, unknown>;
    return typeof score.id === "number"
        && Number.isFinite(score.id)
        && typeof score.game_mode === "string"
        && GAME_MODES.has(score.game_mode)
        && typeof score.score === "number"
        && Number.isFinite(score.score)
        && score.score >= 0
        && (score.wpm === null || (typeof score.wpm === "number" && Number.isFinite(score.wpm)))
        && (score.accuracy === null || (typeof score.accuracy === "number" && Number.isFinite(score.accuracy)))
        && typeof score.created_at === "string";
}

export function loadLocalScores(): LocalScore[] {
    const value = readJson(LOCAL_DATA_KEYS.scores);
    return Array.isArray(value)
        ? value.filter(isLocalScore).sort((a, b) => b.created_at.localeCompare(a.created_at))
        : [];
}

export function appendLocalScore(input: LocalScoreInput): LocalScore {
    const created_at = new Date().toISOString();
    const record: LocalScore = {
        id: Date.now(),
        game_mode: input.game_mode,
        score: Math.max(0, Math.round(input.score)),
        wpm: input.wpm == null ? null : Math.max(0, Math.round(input.wpm)),
        accuracy: input.accuracy == null ? null : Math.max(0, Math.min(100, Math.round(input.accuracy))),
        created_at,
    };
    saveLocalScores([record, ...loadLocalScores()]);
    return record;
}

export function saveLocalScores(scores: LocalScore[]) {
    return writeJson(LOCAL_DATA_KEYS.scores, scores.slice(0, 500));
}
