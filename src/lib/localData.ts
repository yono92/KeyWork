import type { AvatarConfig, CustomText, LocalProfile, LocalScore, LocalScoreInput } from "@/types/domain";

export const LOCAL_DATA_KEYS = {
    profile: "keywork.profile.v1",
    customTexts: "keywork.customTexts.v1",
    scores: "keywork.scores.v1",
} as const;

const canUseStorage = () => typeof window !== "undefined";

function readJson(key: string): unknown {
    if (!canUseStorage()) return null;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeJson(key: string, value: unknown) {
    if (!canUseStorage()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
}

function isAvatarConfig(value: unknown): value is AvatarConfig {
    if (!value || typeof value !== "object") return false;
    const avatar = value as Record<string, unknown>;
    return ["skin", "hair", "hairColor", "eyes", "mouth", "hat", "accessory"]
        .every((key) => typeof avatar[key] === "number");
}

export function getDefaultLocalProfile(): LocalProfile {
    return {
        nickname: "Player",
        avatar_config: null,
        created_at: new Date(0).toISOString(),
    };
}

export function loadLocalProfile(): LocalProfile {
    const value = readJson(LOCAL_DATA_KEYS.profile);
    if (!value || typeof value !== "object") return getDefaultLocalProfile();
    const profile = value as Record<string, unknown>;
    return {
        nickname: typeof profile.nickname === "string" && profile.nickname.trim()
            ? profile.nickname.trim().slice(0, 20)
            : "Player",
        avatar_config: isAvatarConfig(profile.avatar_config) ? profile.avatar_config : null,
        created_at: typeof profile.created_at === "string"
            ? profile.created_at
            : new Date().toISOString(),
    };
}

export function saveLocalProfile(profile: LocalProfile) {
    writeJson(LOCAL_DATA_KEYS.profile, profile);
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
    writeJson(LOCAL_DATA_KEYS.customTexts, texts.slice(0, 200));
}

function isLocalScore(value: unknown): value is LocalScore {
    if (!value || typeof value !== "object") return false;
    const score = value as Record<string, unknown>;
    return typeof score.id === "number"
        && typeof score.game_mode === "string"
        && typeof score.score === "number"
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
        is_multiplayer: false,
        is_win: null,
        created_at,
    };
    saveLocalScores([record, ...loadLocalScores()]);
    return record;
}

export function saveLocalScores(scores: LocalScore[]) {
    writeJson(LOCAL_DATA_KEYS.scores, scores.slice(0, 500));
}
