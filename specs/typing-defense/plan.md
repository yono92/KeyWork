# Typing Defense — Technical Plan

## 아키텍처

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/components/TypingDefenseGame.tsx` | 메인 게임 컴포넌트 (UI + 렌더링) |
| `src/hooks/useDefenseEngine.ts` | 게임 로직 (적 스폰, 이동, 웨이브, 점수) |
| `app/(game)/typing-defense/page.tsx` | 라우트 페이지 |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/features/game-shell/config.ts` | GameMode에 `typing-defense` 추가, NAV_ITEMS에 항목 추가, PAGE_TITLES 추가 |
| `src/components/MainLayout.tsx` | `typing-defense` 모드 dynamic import 추가 |
| `src/components/navigation/NavMenu.tsx` | VISIBLE_MENU_ITEMS에 `typing-defense` 추가 |

### 재사용 파일 (수정 없음)

| 파일 | 용도 |
|------|------|
| `src/components/game/DifficultySelector.tsx` | 난이도 선택 UI |
| `src/components/game/GameOverModal.tsx` | 게임 오버 모달 |
| `src/components/game/PauseOverlay.tsx` | 일시정지 오버레이 |
| `src/components/game/GameInput.tsx` | 한/영 IME 입력 |
| `src/hooks/useGameAudio.ts` | 효과음 |
| `src/hooks/useKoreanWords.ts` | 단어 풀 |
| `src/hooks/useScoreSubmit.ts` | 리더보드 제출 |
| `src/data/word.json` | 일반 적 단어 |
| `src/data/proverbs.json` | 보스 문장 |

## 핵심 설계

### Enemy 인터페이스

```typescript
interface Enemy {
  id: number;
  word: string;
  type: "normal" | "fast" | "tank" | "boss";
  x: number;           // 0~100 (% 기반, 100=오른쪽)
  speed: number;        // px per frame
  hp: number;           // 보스용 (일반: 1)
  maxHp: number;
  status: "marching" | "targeted" | "dying" | "dead" | "reached";
  spawnDelay: number;   // 웨이브 내 스폰 딜레이
}
```

### 웨이브 설계

```typescript
interface WaveConfig {
  waveNumber: number;
  enemies: { type: EnemyType; count: number }[];
  isBossWave: boolean;
  spawnInterval: number;  // ms between spawns
}

// 웨이브 생성 로직
function generateWave(waveNumber: number, difficulty: Difficulty): WaveConfig {
  const isBoss = waveNumber % 5 === 0;
  const baseCount = Math.min(5 + waveNumber * 2, 20);

  return {
    waveNumber,
    isBossWave: isBoss,
    enemies: [
      { type: "normal", count: Math.floor(baseCount * 0.6) },
      { type: "fast", count: Math.floor(baseCount * 0.25) },
      { type: "tank", count: Math.floor(baseCount * 0.15) },
      ...(isBoss ? [{ type: "boss", count: 1 }] : []),
    ],
    spawnInterval: 2000 * difficultyConfig[difficulty].spawnMul,
  };
}
```

### 게임 루프

```
┌─────────────────────────────────────────────────────┐
│  useDefenseEngine                                    │
│                                                      │
│  1. Spawn Loop (setInterval)                         │
│     - 웨이브 설정에 따라 적 생성                       │
│     - 웨이브 내 모든 적 스폰 완료 → 대기               │
│     - 필드 내 적 0마리 → 다음 웨이브                   │
│                                                      │
│  2. Movement Loop (requestAnimationFrame)            │
│     - 적 x좌표 감소 (왼쪽으로 이동)                    │
│     - x <= 0 → 기지 도달 → 목숨 감소                  │
│     - delta time 기반 보간                            │
│                                                      │
│  3. Input Handler                                    │
│     - 입력 문자열과 적 단어 매칭                       │
│     - 매칭 성공 → 적 상태 dying → 점수 추가            │
│     - 부분 매칭 → 해당 적 targeted 표시               │
│                                                      │
│  4. Cleanup (setTimeout)                             │
│     - dying 상태 적 → 애니메이션 후 제거               │
└─────────────────────────────────────────────────────┘
```

### 적 타입별 설정

| 타입 | 단어 길이 | 이동 속도 | 크기 | 점수 배율 |
|------|-----------|-----------|------|-----------|
| normal | 2~4자 | 1.0× | 보통 | 1.0× |
| fast | 1~2자 | 1.8× | 작음 | 1.2× |
| tank | 4~6자 | 0.5× | 큼 | 1.5× |
| boss | 문장 | 0.3× | 매우 큼 | 5.0× |

### UI 레이아웃

```
┌─────────────────────────────────────────┐
│  Wave 3  │  Score: 2450  │  ×5 Combo   │  ← HUD
├──────────┴───────────────┴─────────────┤
│  ♥♥♥                                    │  ← 목숨
│                                          │
│  🏰        "사랑"    "행복"     "기쁨"  │  ← 게임 필드
│  기지   ←── 적들이 왼쪽으로 행진 ──      │
│                                          │
│           "보스: 까마귀 떡 감추듯"       │  ← 보스
│                                          │
├──────────────────────────────────────────┤
│  [타이핑 입력창]                    Enter │  ← 입력
└──────────────────────────────────────────┘
```

## 리스크

| 리스크 | 대응 |
|--------|------|
| 적이 너무 빨리 몰려와 입력이 불가능 | 스폰 간격 최소값 설정 (800ms), 난이도별 튜닝 |
| 보스 문장이 너무 길어 처치 전 기지 도달 | 보스 이동속도 0.3×, 보스 등장 시 다른 적 스폰 일시 중단 |
| 한국어 IME 조합 중 매칭 오류 | GameInput 컴포넌트 재사용으로 해결 (검증됨) |
| 모바일에서 세로 레이아웃 | 적 이동을 위→아래로 전환하거나, 가로 스크롤 유지 + 터치 입력 |

## 테스트 전략

- **유닛**: useDefenseEngine 웨이브 생성, 점수 계산, 적 매칭 로직
- **스모크**: 컴포넌트 렌더링 + 난이도 선택 UI 표시
- **E2E**: Playwright로 게임 시작 → 적 등장 → 타이핑 → 처치 확인
