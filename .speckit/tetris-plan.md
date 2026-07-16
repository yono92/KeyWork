# 레트로 테트리스 재구축 구현 계획

## 구현 전략

기존 라우트와 게임 셸, 로컬 점수 저장은 유지한다. 모래 그리드 중심의 엔진과 렌더링은 반응형 CSS 셀 보드로 교체한다. 게임 규칙은 순수 코어 모듈로 분리하고 React 훅은 타이머·입력·UI 동기화를 담당한다.

## 구조

### 1. 순수 게임 코어

`src/lib/tetrisCore.ts`를 추가한다.

- `createBoard()`
- `createBag()` / `drawFromBag()`
- `canPlace()`
- `rotateWithKick()`
- `lockPiece()`
- `clearCompletedLines()`
- `getGhostY()`
- `getLineClearScore()`

랜덤 함수는 테스트에서 주입 가능하게 만들어 7-bag 순서를 결정적으로 검증한다.

### 2. 엔진 훅 교체

`src/hooks/useTetrisEngine.ts`의 외부 인터페이스는 가능한 한 유지한다.

- 모래 상태와 settling/flashGrid/chainStep 제거
- `Cell[][]`, 활성 피스, bag/queue, hold 상태로 교체
- 레벨별 interval로 자동 낙하 처리
- 이동·회전·드롭·홀드 후 보드 버전만 갱신
- 라인 삭제와 점수 계산 후 콜백 호출

### 3. 렌더러와 HUD 단순화

`src/components/TetrisGame.tsx`에서 모래 grain 렌더링을 제거한다.

- 고정 블록 → 고스트 → 활성 블록 순서로 셀 렌더
- 데스크톱 3열 HUD와 모바일 압축 HUD 유지
- 시작·일시정지·게임오버 오버레이 문구 통일
- 라인 삭제는 짧은 전광판 문구로 피드백

### 4. 제거 대상

- `src/lib/sandPhysics.ts`
- `src/lib/waterShader.ts`가 다른 소비처가 없으면 함께 제거
- 모래 전용 draw 함수와 상태
- `src/utils/terrainTextures.ts`가 다른 소비처가 없으면 함께 제거
- `SANDTRIS`, 샌드트리스, 모래 물리 메타데이터와 문서
- 멀티플레이 하위 호환용 `applyGarbage`가 소비되지 않으면 제거

### 5. 라우트와 문서

- `app/(game)/tetris/layout.tsx` 메타데이터를 레트로 테트리스로 변경
- 랜딩과 사이드 메뉴의 `테트리스 / Tetris` 명칭 유지
- README/CLAUDE/spec 문서를 클래식 룰로 동기화

## 상태 흐름

```text
START
  → spawn from 7-bag
  → input / timed drop
  → collision
  → lock to 10×20 board
  → clear full rows
  → update score, lines, level
  → spawn next
  → spawn collision ? GAME OVER : continue
```

## 리스크와 대응

- **회전 회귀**: 피스별 회전 상태와 월킥을 테이블 테스트한다.
- **중복 입력**: 키 이벤트는 엔진 액션 한 경로로 통합하고 기본 스크롤을 차단한다.
- **모바일 보드 잘림**: CSS 기반 반응형 폭을 적용하고 375×812 뷰포트에서 가로 오버플로를 검증한다.
- **점수 중복 저장**: 기존 `scoreRecordedRef` 패턴을 유지한다.
- **대규모 재작성 위험**: 라우트·점수 저장·공통 셸은 건드리지 않고 테트리스 내부만 교체한다.

## 의존성 정책

새 패키지를 추가하지 않는다. React, 기존 Tailwind/레트로 토큰만 사용한다.
