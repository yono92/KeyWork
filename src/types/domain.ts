export type GameMode =
    | "practice"
    | "falling-words"
    | "word-chain"
    | "typing-runner"
    | "tetris";

export interface AvatarConfig {
    skin: number;
    hair: number;
    hairColor: number;
    eyes: number;
    mouth: number;
    hat: number;
    accessory: number;
}

export interface LocalProfile {
    nickname: string;
    avatar_config: AvatarConfig | null;
    created_at: string;
}

export interface CustomText {
    id: number;
    title: string;
    content: string;
    language: "korean" | "english";
    created_at: string;
    updated_at: string;
}

export interface LocalScore {
    id: number;
    game_mode: GameMode;
    score: number;
    wpm: number | null;
    accuracy: number | null;
    is_multiplayer: false;
    is_win: null;
    created_at: string;
}

export interface LocalScoreInput {
    game_mode: GameMode;
    score: number;
    wpm?: number | null;
    accuracy?: number | null;
}

export type LeaderboardPeriod = "all" | "week" | "day";
