# findings.md

## 2026-03-18 단어낙하 레이아웃 안정화

### 분석
1. `SideNav`의 `md:w-20` 폭에서 `ControlTray`가 5열 고정 그리드를 유지해 하단 토글이 수평으로 넘쳤다.
2. `ThemeToggle`는 `min-w-16`이 고정돼 compact 레이아웃에서 폭 축소가 되지 않았다.
3. 단어낙하 시작 화면은 중간 폭 데스크톱에서 오버레이 카드와 내부 여백 비율이 작아 보여 게임판이 더 어수선하게 느껴졌다.

### 변경
1. `ControlTray`에 `compact` 변형을 추가하고, 좁은 사이드바에서는 1열 세로 스택으로 렌더링되도록 변경했다.
2. `ThemeToggle`가 compact 모드에서 축약 라벨과 폭 축소를 허용하도록 정리했고, `MuteToggle` 래퍼를 `w-full`로 맞춰 버튼 폭이 셀을 채우도록 수정했다.
3. `SideNav`의 compact 폭을 소폭 넓히고 하단 영역에 `overflow-hidden`을 적용해 설정 영역이 옆 패널과 겹치지 않게 정리했다.
4. `FallingWordsGame`의 시작 오버레이 카드 폭/타이포/버튼 높이를 키우고 최소 높이를 보정해 900~1024px 구간에서도 비율이 안정적으로 보이게 조정했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과 (24 files, 94 tests)
- `npm run build`: 통과
- 수동 확인: headless Chromium으로 `900x768`, `1024x768`에서 `/falling-words` 시작 화면 및 compact 사이드바 트레이 겹침 없음 확인
