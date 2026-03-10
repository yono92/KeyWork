// Supabase DB 스키마 TypeScript 타입 정의
// schema.sql과 동기화 유지

export type GameMode =
  | "practice"
  | "falling-words"
  | "word-chain"
  | "typing-race"
  | "typing-defense"
  | "dictation";

export type RoomStatus = "waiting" | "playing" | "finished";

// ── 테이블 Row 타입 ──

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
}

export interface GameScore {
  id: number;
  user_id: string;
  game_mode: GameMode;
  score: number;
  wpm: number | null;
  accuracy: number | null;
  lines: number | null;
  distance: number | null;
  is_multiplayer: boolean;
  is_win: boolean | null;
  created_at: string;
}

export interface Room {
  id: string;
  game_mode: string;
  status: RoomStatus;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  created_at: string;
}

// ── INSERT 타입 ──

export type GameScoreInsert = {
  user_id: string;
  game_mode: string;
  score: number;
  wpm?: number | null;
  accuracy?: number | null;
  lines?: number | null;
  distance?: number | null;
  is_multiplayer?: boolean;
  is_win?: boolean | null;
};

// ── get_leaderboard() RPC 반환 타입 ──

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  score: number;
  created_at: string;
}

export type LeaderboardPeriod = "all" | "week" | "day";

// ── Supabase Database 타입 (supabase client 제네릭용) ──

interface GenericRelationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          nickname: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      game_scores: {
        Row: GameScore;
        Insert: {
          id?: number;
          user_id: string;
          game_mode: string;
          score?: number;
          wpm?: number | null;
          accuracy?: number | null;
          lines?: number | null;
          distance?: number | null;
          is_multiplayer?: boolean;
          is_win?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          game_mode?: string;
          score?: number;
          wpm?: number | null;
          accuracy?: number | null;
          lines?: number | null;
          distance?: number | null;
          is_multiplayer?: boolean;
          is_win?: boolean | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      rooms: {
        Row: Room;
        Insert: {
          id: string;
          game_mode: string;
          status?: string;
          player1_id?: string | null;
          player2_id?: string | null;
          winner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_mode?: string;
          status?: string;
          player1_id?: string | null;
          player2_id?: string | null;
          winner_id?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_leaderboard: {
        Args: {
          p_game_mode: string;
          p_period?: string;
          p_limit?: number;
        };
        Returns: LeaderboardEntry[];
      };
    };
  };
}
