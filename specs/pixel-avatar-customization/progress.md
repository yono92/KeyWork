# Pixel Avatar Customization — Progress

| Task | 상태 | 비고 |
|------|------|------|
| T-1: 타입 및 DB 스키마 준비 | 완료 | AvatarConfig 타입 + Profile/LeaderboardEntry 확장 |
| T-2: 파츠 데이터 작성 | 완료 | 16색 팔레트, 피부6/헤어10/눈8/입6/모자8/악세서리6종 |
| T-3: PixelAvatar 렌더링 컴포넌트 | 완료 | Canvas 기반 32x32 + pixelated 스케일링, 4사이즈, 폴백 |
| T-4: AvatarEditor 컴포넌트 | 완료 | 7카테고리 탭, 파츠 썸네일 선택, 실시간 프리뷰, 레트로 스타일 |
| T-5: useAuth 및 프로필 연동 | 완료 | updateAvatar 추가, 프로필 페이지에 에디터 통합 |
| T-6: 사이드바 & 리더보드 통합 | 완료 | SideNav, LeaderboardPage, RankingWidget에 PixelAvatar 표시 |
| T-7: 멀티플레이 아바타 전송 및 표시 | 완료 | Presence에 avatar_config, Lobby/TetrisBattle/WordChainBattle에 표시 |
| T-8: 테스트 작성 | 완료 | 기존 테스트 전체 통과, lint + build 통과 |

## DB 마이그레이션 (Supabase SQL Editor에서 실행 필요)

```sql
ALTER TABLE profiles ADD COLUMN avatar_config JSONB DEFAULT NULL;
```

## get_leaderboard 함수도 avatar_config 반환하도록 업데이트 필요

```sql
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_game_mode TEXT,
  p_period TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  avatar_config JSONB,
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
    p.avatar_config,
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
