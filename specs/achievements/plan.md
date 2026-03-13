# 업적/뱃지 시스템 — Plan

## 기술 설계

### 1. DB 스키마 (Supabase Migration)

```sql
CREATE TABLE user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2. 업적 정의 (src/data/achievements.ts)

정적 정의. 각 업적은:
- `id`: 고유 문자열 (e.g. "first-play", "practice-100")
- `category`: "beginner" | "mode-master" | "record" | "grinder" | "multiplayer"
- `icon`: 이모지
- `name`: { ko, en }
- `description`: { ko, en }
- `check`: (context: CheckContext) => boolean

CheckContext에는 현재 점수, 유저 통계, game_scores 집계가 포함.

### 3. 업적 검사 훅 (src/hooks/useAchievementChecker.ts)

- useScoreSubmit 이후 호출
- 유저의 기존 해금 목록 로드 (user_achievements)
- 전체 업적 정의를 순회하며 미해금 + 조건 충족인 것 필터
- 새로 해금된 업적들을 user_achievements에 일괄 INSERT
- 새로 해금된 목록 반환

### 4. 업적 표시 훅 (src/hooks/useAchievements.ts)

- 프로필 페이지에서 사용
- 유저의 전체 해금 목록 조회
- 정적 정의와 조인하여 해금/미해금 상태 반환

### 5. UI 통합

- **GameOverModal**: badge prop에 새 업적 목록 렌더
- **프로필 페이지**: UserStatsSection 아래에 업적 그리드 추가

## 영향 파일

| 파일 | 변경 |
|------|------|
| Supabase migration | user_achievements 테이블 생성 |
| src/lib/supabase/types.ts | UserAchievement 타입 추가 |
| src/data/achievements.ts | 신규: 업적 정의 |
| src/hooks/useAchievementChecker.ts | 신규: 점수 제출 후 검사 |
| src/hooks/useAchievements.ts | 신규: 프로필용 조회 |
| src/components/game/GameOverModal.tsx | 업적 알림 표시 |
| app/(game)/profile/page.tsx | 업적 섹션 추가 |
| DictationGame, TypingDefenseGame 등 | useAchievementChecker 연동 |

## 리스크

- 클라이언트 검사이므로 조작 가능 → 초기에는 허용, 향후 서버 함수로 이관 가능
- game_scores 전량 조회 시 성능 → useUserStats에서 이미 하고 있으므로 공유

## 테스트 전략

- lint, build 통과
- Playwright 스크린샷: 프로필 업적 섹션 (비로그인)
