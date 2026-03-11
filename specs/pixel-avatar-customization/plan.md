# Pixel Avatar Customization — Plan

## 기술 설계

### 1. 데이터 레이어

#### DB 변경
```sql
ALTER TABLE profiles ADD COLUMN avatar_config JSONB DEFAULT NULL;
```
- 기존 `avatar_url` 유지 (하위호환)
- `avatar_config`가 null이면 기본 아바타(닉네임 첫 글자) 표시

#### TypeScript 타입 (`src/lib/supabase/types.ts`)
```typescript
interface AvatarConfig {
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  mouth: number;
  hat: number;      // -1 = 없음
  accessory: number; // -1 = 없음
}
```
Profile 타입에 `avatar_config: AvatarConfig | null` 추가

### 2. 파츠 데이터 구조 (`src/data/avatar-parts.ts`)

각 파츠는 32x32 그리드에서 해당 영역의 픽셀 좌표 + 팔레트 인덱스로 정의:

```typescript
// 팔레트 (16색 레트로 팔레트)
const AVATAR_PALETTE = [
  "transparent",     // 0
  "#2b2b2b",         // 1 - 검정(외곽선)
  "#f5d6b8",         // 2 - 피부 밝은
  "#d4a574",         // 3 - 피부 중간
  // ... 16색
];

// 파츠 정의
interface PartDefinition {
  id: number;
  name: string;
  pixels: [number, number, number][]; // [x, y, paletteIndex][]
}

// 카테고리별 파츠 배열
const SKIN_PARTS: PartDefinition[] = [...];
const HAIR_PARTS: PartDefinition[] = [...];
// ...
```

### 3. 렌더링 컴포넌트 (`src/components/avatar/PixelAvatar.tsx`)

**Canvas 기반 렌더링**:
- 32x32 offscreen canvas에 레이어 순서대로 픽셀 그리기
- CSS로 `image-rendering: pixelated` 적용하여 크리스피 스케일링
- `useMemo`로 config 변경 시에만 재렌더링

```typescript
interface PixelAvatarProps {
  config: AvatarConfig | null;
  nickname: string;        // 폴백용
  size: "sm" | "md" | "lg" | "xl";  // 24 | 32 | 48 | 64
  className?: string;
}
```

### 4. 아바타 에디터 (`src/components/avatar/AvatarEditor.tsx`)

- 프로필 페이지에 인라인 또는 모달로 표시
- 카테고리 탭: 피부 | 헤어 | 눈 | 입 | 모자 | 악세서리
- 각 탭에서 파츠 썸네일 그리드 (선택 가능)
- 헤어 컬러 피커 (8색 팔레트 스와치)
- 실시간 프리뷰 (64px 크기)
- 저장/취소 버튼

### 5. 통합 포인트

| 파일 | 변경 내용 |
|------|----------|
| `src/hooks/useAuth.ts` | profile에 avatar_config 포함 |
| `src/lib/supabase/types.ts` | AvatarConfig 타입, Profile에 필드 추가 |
| `app/(game)/profile/page.tsx` | PixelAvatar + AvatarEditor 통합 |
| `src/components/SideNav.tsx` | 닉네임 옆 PixelAvatar(sm) 표시 |
| `app/(game)/leaderboard/page.tsx` | 순위 항목에 PixelAvatar(sm) 추가 |
| `src/components/ranking/RankingWidget.tsx` | 순위 항목에 PixelAvatar(sm) 추가 |
| `src/components/multiplayer/MultiplayerLobby.tsx` | 대기 화면에 PixelAvatar(lg) |
| `src/components/multiplayer/TetrisBattle.tsx` | 나/상대 라벨에 PixelAvatar(md) |
| `src/components/multiplayer/WordChainBattle.tsx` | 채팅에 PixelAvatar(sm) |
| `src/hooks/useMultiplayerRoom.ts` | presence에 avatar_config 포함 |

### 6. 파츠 디자인 가이드

**32x32 그리드 영역 배분:**
```
Row 0-3:   모자/머리장식 영역
Row 4-7:   헤어 상단
Row 8-12:  눈 영역
Row 13-15: 코/입 영역
Row 16-20: 헤어 하단/어깨
Row 21-27: 몸통 (피부색 기반 단순 형태)
Row 28-31: 하단 (잘림 가능)
```

**색상 팔레트 (16색):**
```
0: transparent
1: #1a1a2e (외곽선 — retro-game-bg)
2-4: 피부색 3단계 (밝음/중간/어둠 — skin 파라미터로 세트 변경)
5-7: 헤어색 3단계 (hairColor 파라미터로 세트 변경)
8: #ffffff (하이라이트/눈 흰자)
9: #1e1e1e (눈동자/진한)
10: #ef4444 (빨강 — retro-game-danger)
11: #22c55e (초록 — retro-game-success)
12: #3b82f6 (파랑 — retro-game-highlight)
13: #ffe000 (노랑 — retro-game-warning)
14: #00e5ff (시안 — retro-game-info)
15: #888899 (회색 — retro-game-text-dim)
```

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 파츠 디자인 품질 | 유저 만족도 | 16색 제한 팔레트로 레트로 감성 유지, 심플한 형태 |
| Canvas 성능 (리더보드 10개+) | 프레임 드랍 | useMemo + 한 번 그린 후 캐시, offscreen canvas |
| DB 마이그레이션 실패 | 기능 미작동 | avatar_config NULL 허용, 폴백 동작 보장 |
| 멀티플레이 데이터 증가 | 지연 | AvatarConfig은 ~50bytes, 무시 가능 |

## 테스트 전략

1. **단위 테스트**: 파츠 데이터 무결성 (모든 파츠의 좌표가 32x32 범위 내)
2. **단위 테스트**: PixelAvatar 폴백 동작 (config null → 닉네임 첫 글자)
3. **스모크 테스트**: AvatarEditor 마운트 + 파츠 선택 + 프리뷰 갱신
4. **E2E**: 프로필에서 아바타 저장 → 사이드바 반영 확인
5. **빌드**: lint + build 통과
