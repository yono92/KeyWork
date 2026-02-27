# plan.md

## 구현 전략
Outside-in으로 라우트 진입 UX와 조작 흐름을 먼저 고정하고, 이후 내부 보드/블록 로직을 최소 구현으로 맞춘다.

## 설계 개요
1. 게임 모드 확장
- `GameMode`에 `tetris` 추가
- `MainLayout` 렌더 맵에 `TetrisGame` 연결
- 사이드 메뉴/랜딩 카드/사이트맵 노출

2. 게임 로직
- 10x20 보드, 7종 테트로미노, 회전 상태 배열 정의
- 틱 기반 자동 하강(`setInterval`)
- 충돌 검사, 고정, 줄 제거, 다음 블록 큐 처리

3. 조작 체계
- 키보드: 방향키/Space/P
- 모바일: 좌/회전/우/하강/드롭 버튼

4. 상태/피드백
- 점수/라인/레벨 표시
- 시작/일시정지/새 게임
- 게임오버 배너

5. 테스트
- `MainLayout` 모드 매핑 테스트에 `tetris` 추가
- `SideNav` 이동 테스트에 `tetris` 추가
- 게임 smoke 테스트에 `TetrisGame` 추가

## 영향 범위
- `src/components/TetrisGame.tsx` (신규)
- `app/(game)/tetris/page.tsx` (신규)
- `src/features/game-shell/config.ts`
- `src/components/MainLayout.tsx`
- `src/components/navigation/NavMenu.tsx`
- `app/page.tsx`
- `app/sitemap.ts`
- `tests/components/mainlayout.test.tsx`
- `tests/components/sidenav.test.tsx`
- `tests/components/games.smoke.test.tsx`

## 리스크 및 대응
1. 게임 루프 타이밍 오차
- 대응: 레벨 기반 단순 interval 정책으로 제한
2. 모바일 조작성 저하
- 대응: 별도 버튼 그룹 제공
3. 기존 UI 복잡도 증가
- 대응: 메뉴 노출은 1개 신규 모드만 추가
