-- ============================================================
-- KeyWork: Supabase DB 스키마 마이그레이션
-- Supabase SQL Editor에서 실행
-- T-2: profiles, game_scores, rooms + RLS + get_leaderboard()
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. profiles 테이블 (auth.users 확장)
-- ──────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (true);

-- 본인만 INSERT (회원가입 시)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 본인만 UPDATE (닉네임 변경 등)
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ──────────────────────────────────────────────
-- 2. game_scores 테이블
-- ──────────────────────────────────────────────
CREATE TABLE game_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL,        -- 'practice' | 'falling-words' | 'word-chain' | 'typing-race' | 'typing-defense' | 'dictation'
  score INTEGER NOT NULL DEFAULT 0,
  wpm REAL,                       -- 문장연습 / 타이핑레이스
  accuracy REAL,                  -- 문장연습 / 받아쓰기
  lines INTEGER,                  -- (미래 테트리스용)
  distance REAL,                  -- (미래 러너용)
  is_multiplayer BOOLEAN DEFAULT FALSE,
  is_win BOOLEAN,                 -- 멀티플레이 승패
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_scores_leaderboard ON game_scores(game_mode, score DESC);
CREATE INDEX idx_scores_user ON game_scores(user_id, created_at DESC);
CREATE INDEX idx_scores_daily ON game_scores(game_mode, created_at DESC);

-- RLS 활성화
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 (랭킹 조회)
CREATE POLICY "scores_read" ON game_scores
  FOR SELECT USING (true);

-- 본인만 INSERT
CREATE POLICY "scores_insert" ON game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 3. rooms 테이블 (멀티플레이 매칭)
-- ──────────────────────────────────────────────
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,            -- 6자리 방 코드
  game_mode TEXT NOT NULL,        -- 'typing-defense' | 'word-chain' 등
  status TEXT DEFAULT 'waiting',  -- 'waiting' | 'playing' | 'finished'
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스: 대기 중인 방 빠른 조회
CREATE INDEX idx_rooms_waiting ON rooms(status, game_mode) WHERE status = 'waiting';

-- RLS 활성화
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 (방 목록 조회)
CREATE POLICY "rooms_read" ON rooms
  FOR SELECT USING (true);

-- 방장만 INSERT
CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

-- 참가자만 UPDATE (player2 참가, 상태 변경 등)
CREATE POLICY "rooms_update" ON rooms
  FOR UPDATE USING (
    auth.uid() = player1_id OR auth.uid() = player2_id
  );

-- ──────────────────────────────────────────────
-- 4. get_leaderboard() DB Function
-- 게임 모드별 TOP N 랭킹 조회
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_game_mode TEXT,
  p_period TEXT DEFAULT 'all',   -- 'all' | 'week' | 'day'
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY gs.score DESC) AS rank,
    gs.user_id,
    p.nickname,
    p.avatar_url,
    gs.score,
    gs.created_at
  FROM game_scores gs
  JOIN profiles p ON p.id = gs.user_id
  WHERE gs.game_mode = p_game_mode
    AND (
      p_period = 'all'
      OR (p_period = 'week' AND gs.created_at > now() - interval '7 days')
      OR (p_period = 'day' AND gs.created_at > now() - interval '1 day')
    )
  ORDER BY gs.score DESC
  LIMIT p_limit;
$$;
