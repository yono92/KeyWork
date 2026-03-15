# 관리자 대시보드 — 기술 설계

## 아키텍처 개요

```
[/admin UI] → [/api/admin/* API Routes] → [Supabase (service_role key)]
                      ↓
              role 검증 미들웨어
```

관리자 API는 `SUPABASE_SERVICE_ROLE_KEY`를 사용하여 RLS를 우회하고,
API 라우트 레벨에서 요청자의 role을 검증합니다.

## DB 변경사항

### 1. profiles 테이블 role 컬럼 추가
```sql
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;

-- admin RLS 정책: admin은 모든 profiles 수정 가능
CREATE POLICY "admin_profiles_all" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- admin은 모든 game_scores 삭제 가능
CREATE POLICY "admin_scores_delete" ON game_scores
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- admin은 모든 rooms CRUD 가능
CREATE POLICY "admin_rooms_all" ON rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### 2. game_config 테이블
```sql
CREATE TABLE game_config (
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
CREATE POLICY "config_write" ON game_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

## 영향 파일

### 신규 파일
- `app/admin/layout.tsx` — admin 레이아웃 (사이드바 네비게이션)
- `app/admin/page.tsx` — 대시보드 홈 (통계 카드)
- `app/admin/users/page.tsx` — 유저 관리
- `app/admin/scores/page.tsx` — 점수 관리
- `app/admin/rooms/page.tsx` — 방 관리
- `app/admin/game-config/page.tsx` — 게임 설정
- `app/api/admin/users/route.ts` — 유저 CRUD API
- `app/api/admin/scores/route.ts` — 점수 관리 API
- `app/api/admin/rooms/route.ts` — 방 관리 API
- `app/api/admin/game-config/route.ts` — 게임 설정 API
- `app/api/admin/stats/route.ts` — 대시보드 통계 API
- `src/lib/supabase/admin.ts` — service_role 키 기반 admin 클라이언트
- `src/lib/admin-auth.ts` — API 라우트용 admin role 검증 헬퍼
- `src/hooks/useGameConfig.ts` — 게임 설정 fetch 훅
- `specs/admin-dashboard/schema.sql` — 마이그레이션 SQL

### 수정 파일
- `middleware.ts` — `/admin` 경로 admin role 체크 추가
- `src/lib/supabase/types.ts` — Profile에 role 필드, game_config 테이블 타입 추가
- `.env.example` — `SUPABASE_SERVICE_ROLE_KEY` 추가
- 게임 컴포넌트들 — DIFFICULTY_CONFIG를 useGameConfig 훅으로 교체

## 환경 변수

```
# 기존
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 신규 (서버 사이드 전용, NEXT_PUBLIC_ 아님)
SUPABASE_SERVICE_ROLE_KEY=...
```

## 리스크

1. **service_role key 노출**: 반드시 서버 사이드(API 라우트)에서만 사용. 절대 클라이언트에 노출 안 됨.
2. **game_config fetch 실패**: 클라이언트에서 fallback 기본값 필수. 게임이 config 없이도 작동해야 함.
3. **첫 관리자 생성**: SQL로 직접 `UPDATE profiles SET role='admin' WHERE nickname='...'` 실행 필요.

## 테스트 전략

- 단위 테스트: admin-auth 헬퍼의 role 검증 로직
- 스모크 테스트: admin 페이지 렌더링
- 수동 테스트: 일반 유저 → admin 접근 차단 확인, 게임 설정 변경 → 반영 확인
