-- ============================================================
-- KeyWork: 관리자 대시보드 스키마 마이그레이션
-- Supabase SQL Editor에서 실행
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. profiles 테이블에 role 컬럼 추가
-- ──────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;

-- admin은 모든 profiles를 수정할 수 있음
CREATE POLICY "admin_profiles_all" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- admin은 game_scores를 삭제할 수 있음
CREATE POLICY "admin_scores_delete" ON game_scores
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- admin은 rooms를 관리할 수 있음
CREATE POLICY "admin_rooms_all" ON rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ──────────────────────────────────────────────
-- 2. game_config 테이블 (게임 설정 관리)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_config (
  game_mode TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 (게임 시작 시 config fetch)
CREATE POLICY "config_read" ON game_config
  FOR SELECT USING (true);

-- admin만 수정
CREATE POLICY "config_admin_write" ON game_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "config_admin_update" ON game_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "config_admin_delete" ON game_config
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ──────────────────────────────────────────────
-- 3. 초기 관리자 설정 (닉네임 수정 필요)
-- ──────────────────────────────────────────────
-- UPDATE profiles SET role = 'admin' WHERE nickname = 'YOUR_ADMIN_NICKNAME';
