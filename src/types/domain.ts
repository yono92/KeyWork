export type GameMode =
    | "practice"
    | "falling-words"
    | "word-chain"
    | "typing-runner"
    | "tetris";

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
    created_at: string;
}

export interface LocalScoreInput {
    game_mode: GameMode;
    score: number;
    wpm?: number | null;
    accuracy?: number | null;
}

export type LeaderboardPeriod = "all" | "week" | "day";
