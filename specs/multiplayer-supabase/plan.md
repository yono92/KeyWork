# Plan: Supabase 통합 (인증 + 랭킹 + 멀티플레이)

---

## Supabase 사전 준비 (이것부터 해야 함)

### 1. Supabase 프로젝트 생성
- https://supabase.com → New Project 생성
- 리전: Northeast Asia (ap-northeast-1, 도쿄) — 한국 유저 지연 최소화

### 2. 필요한 패키지 (2개)
```bash
npm install @supabase/supabase-js @supabase/ssr
```
- `@supabase/supabase-js` — 클라이언트 코어 (DB, Auth, Realtime)
- `@supabase/ssr` — Next.js App Router용 쿠키 기반 세션 관리

### 3. 환경변수 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```
- `NEXT_PUBLIC_` 접두사 = 클라이언트에서도 사용 가능 (anon key는 공개 OK, RLS가 보호)
- Vercel 환경변수에도 동일하게 추가

### 4. 인증 설정
- Supabase Auth > Settings에서 **Email Auth 활성화** (기본 활성)
- 이메일 확인(Email Confirmation) 비활성화 추천 (개발 단계에서 편의)
- **TODO (후순위)**: Google/GitHub/카카오 OAuth 추가

### 5. DB 테이블 (Supabase SQL Editor에서 실행)
```sql
-- 유저 프로필 (auth.users 확장)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 게임 점수 기록
CREATE TABLE game_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL,        -- 'practice'|'falling-words'|'word-chain'|'typing-runner'|'tetris'
  score INTEGER NOT NULL DEFAULT 0,
  wpm REAL,                       -- 문장연습/러너
  accuracy REAL,                  -- 문장연습
  lines INTEGER,                  -- 테트리스
  distance REAL,                  -- 러너
  is_multiplayer BOOLEAN DEFAULT FALSE,
  is_win BOOLEAN,                 -- 멀티플레이 승패
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 대전 방
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,            -- 6자리 코드
  game_mode TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',  -- 'waiting'|'playing'|'finished'
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_scores_leaderboard ON game_scores(game_mode, score DESC);
CREATE INDEX idx_scores_user ON game_scores(user_id, created_at DESC);
CREATE INDEX idx_scores_daily ON game_scores(game_mode, created_at DESC);
CREATE INDEX idx_rooms_waiting ON rooms(status, game_mode) WHERE status = 'waiting';
```

### 6. RLS 정책
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- profiles: 누구나 읽기, 본인만 수정
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- game_scores: 누구나 읽기 (랭킹), 본인만 삽입
CREATE POLICY "scores_read" ON game_scores FOR SELECT USING (true);
CREATE POLICY "scores_insert" ON game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- rooms: 누구나 읽기/삽입, 참가자만 수정
CREATE POLICY "rooms_read" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON rooms FOR INSERT WITH CHECK (auth.uid() = player1_id);
CREATE POLICY "rooms_update" ON rooms FOR UPDATE USING (
  auth.uid() = player1_id OR auth.uid() = player2_id
);
```

### 7. 랭킹 조회용 DB Function
```sql
-- 게임 모드별 TOP N + 내 순위
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
```

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                        클라이언트                         │
│                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ AuthProvider│  │ Game Components│ │ RankingWidget   │  │
│  │ (new)      │  │ (기존 + 확장)  │  │ (new)          │  │
│  └─────┬──────┘  └──────┬───────┘  └───────┬─────────┘  │
│        │                │                    │            │
│  ┌─────▼────────────────▼────────────────────▼─────────┐ │
│  │              Supabase Client (singleton)             │ │
│  │  - Auth (OAuth + 세션)                               │ │
│  │  - Database (scores, profiles, rooms)                │ │
│  │  - Realtime (Presence + Broadcast)                   │ │
│  └─────────────────────┬───────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTPS + WebSocket
                    ┌────▼────┐
                    │ Supabase│
                    │ Cloud   │
                    └─────────┘
```

### Next.js에서 Supabase 클라이언트 패턴 (@supabase/ssr)

```
src/lib/supabase/
  ├── client.ts     ← 브라우저용 (createBrowserClient)
  ├── server.ts     ← 서버 컴포넌트/API Route용 (createServerClient)
  └── middleware.ts  ← 세션 갱신용 미들웨어
```

- `@supabase/ssr`의 `createBrowserClient`는 쿠키 기반 세션 자동 관리
- `middleware.ts` (Next.js root)에서 매 요청마다 세션 리프레시
- 서버 컴포넌트에서는 `createServerClient`로 안전하게 유저 정보 접근

---

## 신규 파일

| 파일 | 역할 |
|------|------|
| `src/lib/supabase/client.ts` | 브라우저 Supabase 클라이언트 |
| `src/lib/supabase/server.ts` | 서버 Supabase 클라이언트 |
| `middleware.ts` | 세션 리프레시 미들웨어 |
| `src/components/auth/AuthProvider.tsx` | 인증 컨텍스트 (유저 상태 전역 공유) |
| `src/components/auth/LoginButton.tsx` | 소셜 로그인 버튼들 |
| `src/components/auth/UserMenu.tsx` | 로그인 상태 표시 + 드롭다운 |
| `src/components/auth/NicknameSetup.tsx` | 첫 로그인 닉네임 설정 모달 |
| `src/components/ranking/RankingWidget.tsx` | 게임 오버 화면 내 랭킹 표시 |
| `src/components/ranking/LeaderboardPage.tsx` | 전체 랭킹 페이지 |
| `src/hooks/useAuth.ts` | 인증 상태 훅 |
| `src/hooks/useLeaderboard.ts` | 랭킹 조회 훅 |
| `src/hooks/useScoreSubmit.ts` | 점수 제출 훅 |
| `src/hooks/useMultiplayerRoom.ts` | 방 생성/참가/매칭 |
| `src/hooks/useMultiplayerTetris.ts` | 테트리스 동기화 |
| `src/hooks/useMultiplayerWordChain.ts` | 끝말잇기 동기화 |
| `src/components/multiplayer/MultiplayerLobby.tsx` | 로비 UI |
| `src/components/multiplayer/TetrisBattle.tsx` | 1v1 테트리스 |
| `src/components/multiplayer/WordChainBattle.tsx` | PvP 끝말잇기 |
| `app/(game)/tetris/battle/page.tsx` | 테트리스 대전 라우트 |
| `app/(game)/word-chain/battle/page.tsx` | 끝말잇기 대전 라우트 |
| `app/(game)/leaderboard/page.tsx` | 랭킹 페이지 라우트 |
| `app/(game)/profile/page.tsx` | 프로필 페이지 라우트 |
| `app/auth/callback/route.ts` | OAuth 콜백 핸들러 (TODO: 소셜 로그인 추가 시) |

### 기존 파일 수정

| 파일 | 변경 |
|------|------|
| `package.json` | `@supabase/supabase-js`, `@supabase/ssr` 추가 |
| `src/store/store.ts` | `user` 상태 추가 (persist 안 함) |
| `src/hooks/useTetrisEngine.ts` | `addGarbageLines()`, `onLineClear` 콜백 |
| `src/hooks/useWordChainGame.ts` | 멀티 모드 분기 |
| `src/components/TetrisGame.tsx` | 싱글/대전 모드 선택 UI |
| `src/components/WordChainGame.tsx` | 싱글/대전 모드 선택 UI |
| `src/components/game/GameOverModal.tsx` | 랭킹 위젯 삽입 + 점수 제출 |
| `src/features/game-shell/config.ts` | 랭킹/프로필 네비게이션 추가 |
| `app/(game)/layout.tsx` | AuthProvider 래핑 |

---

## 핵심 흐름

### 인증 흐름 (이메일/비밀번호)
```
1. 헤더 "회원가입" 클릭 → 이메일 + 비밀번호 + 닉네임 입력 폼
2. supabase.auth.signUp() → auth.users 생성 → profiles INSERT (닉네임)
3. 로그인: supabase.auth.signInWithPassword()
4. 세션: @supabase/ssr 쿠키 기반 자동 관리
5. middleware에서 매 요청 세션 리프레시
```
**TODO (후순위)**: OAuth 추가 시 /auth/callback 라우트 + LoginButton 확장

### 점수 제출 + 랭킹 흐름
```
1. 게임 오버 → GameOverModal 표시
2. 로그인 상태면 → useScoreSubmit으로 game_scores INSERT
3. RankingWidget에서 get_leaderboard() 호출 → TOP 10 + 내 순위 표시
4. 비로그인이면 → "로그인하면 랭킹에 등록됩니다" 안내
```

### 테트리스 대전 흐름
```
1. "온라인 대전" 선택 → MultiplayerLobby 표시
2. 방 생성/참가/빠른 매칭 → rooms 테이블 + Realtime 채널 연결
3. 2명 입장 → 3초 카운트다운 → 게임 시작
4. 각자 로컬 useTetrisEngine + 300ms마다 보드 브로드캐스트
5. 라인 클리어 → garbage 이벤트 → 상대 addGarbageLines()
6. gameOver → 결과 브로드캐스트 + game_scores 기록
```

### Realtime 채널 설계
```
채널: room:{roomId}

[공통]
- presence: { userId, nickname, status }

[테트리스]
- broadcast "board_state": { board: number[][], score, lines, level, gameOver }
- broadcast "garbage": { lines: number }

[끝말잇기]
- broadcast "word_submit": { word, userId }
- broadcast "word_result": { valid, word, nextChar, lives }
- broadcast "turn_change": { currentUserId, timer }
```

---

## 데이터 최적화

- 테트리스 보드: `Cell[][]` → `number[][]` (0~7, 200셀 = ~200B)
- 300ms 간격 = ~0.6KB/s per player — Supabase 무료 티어 충분
- 랭킹 조회: DB Function + 인덱스로 ~50ms 이내
- 점수 제출: 게임 오버 시 1회만

---

## 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Supabase 무료 티어 제한 (500MB DB, 2GB bandwidth) | 스케일 | 점수 기록만 저장, 보드 데이터는 DB에 안 넣음 |
| 닉네임 중복/부적절 | UX 이슈 | UNIQUE constraint + 필터링 |
| Realtime 지연 | 대전 품질 | 가비지 라인 0.5초 버퍼, 낙관적 UI |
| 양쪽 점수 검증 불일치 | 어뷰징 | 클라이언트 trust (v1), 서버 검증은 v2 |

---

## 구현 순서 (의존성 기준)

```
Phase 1: 기반         Phase 2: 인증+랭킹      Phase 3: 멀티플레이
─────────────────    ─────────────────────    ────────────────────
Supabase 셋업   ──▶  Auth + 프로필      ──▶   방 매칭 시스템
클라이언트 설정  ──▶  점수 제출          ──▶   테트리스 대전
미들웨어        ──▶  랭킹 조회/표시     ──▶   끝말잇기 대전
                                              엣지케이스 처리
```

Phase 1 → 2는 순차. Phase 3의 대전 2개는 병렬 가능.
