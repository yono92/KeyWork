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

// ── 아바타 커스터마이징 ──

export interface AvatarConfig {
  skin: number;      // 0-5 피부색 세트
  hair: number;      // 0-9 헤어 스타일
  hairColor: number; // 0-7 헤어 컬러 세트
  eyes: number;      // 0-7 눈 스타일
  mouth: number;     // 0-5 입 스타일
  hat: number;       // -1(없음) ~ 7
  accessory: number; // -1(없음) ~ 5
}

// ── 테이블 Row 타입 ──

export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  avatar_config: AvatarConfig | null;
  role: UserRole;
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

export interface UserAchievement {
  id: number;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface GameConfig {
  game_mode: string;
  config: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface CustomText {
  id: number;
  user_id: string;
  title: string;
  content: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export type FriendshipStatus = "pending" | "accepted";

export interface Friendship {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

/** 친구 목록 표시용 (프로필 정보 포함) */
export interface FriendWithProfile {
  friendshipId: number;
  friendId: string;
  nickname: string;
  avatarConfig: AvatarConfig | null;
  since: string;
}

/** 받은/보낸 요청 표시용 */
export interface FriendRequest {
  friendshipId: number;
  userId: string;
  nickname: string;
  avatarConfig: AvatarConfig | null;
  createdAt: string;
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
  avatar_config: AvatarConfig | null;
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
          avatar_config?: AvatarConfig | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          avatar_url?: string | null;
          avatar_config?: AvatarConfig | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      game_config: {
        Row: GameConfig;
        Insert: {
          game_mode: string;
          config: Record<string, unknown>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          game_mode?: string;
          config?: Record<string, unknown>;
          updated_at?: string;
          updated_by?: string | null;
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
      friendships: {
        Row: Friendship;
        Insert: {
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
          created_at?: string;
        };
        Update: {
          status?: FriendshipStatus;
        };
        Relationships: GenericRelationship[];
      };
      custom_texts: {
        Row: CustomText;
        Insert: {
          user_id: string;
          title: string;
          content: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          language?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: {
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: {
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
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
