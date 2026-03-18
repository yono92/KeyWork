# plan.md

## 구현 전략
- 사이드 네브 하단 트레이를 `full`/`compact` 변형으로 나눠 좁은 폭에서는 세로 스택으로 렌더링한다.
- 단어낙하 게임판은 컨테이너 높이 계산과 시작 오버레이 스케일을 조정해 중간 폭에서도 비율이 안정적으로 보이게 한다.
- 토글 버튼 중 폭 고정이 강한 컴포넌트는 compact 변형에서 축소 가능하도록 정리한다.

## 영향 파일
- `src/components/navigation/ControlTray.tsx`
- `src/components/SideNav.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/FallingWordsGame.tsx`
- 필요 시 테스트 파일 추가

## 리스크 및 완화
- 사이드 네브 compact 레이아웃 변경이 모바일 드로어 레이아웃에 영향을 줄 수 있다.
- `ControlTray`에 variant prop을 추가하고 모바일은 기존 `full` 레이아웃을 유지해 영향 범위를 제한한다.
- 단어낙하 높이 조정이 다른 화면 높이에서 답답해질 수 있다.
- 시작 오버레이와 프레임 크기만 조정하고 게임 로직/좌표 계산은 유지한다.

## 테스트 전략
- `npm run lint`
- `npm run test:run`
- `npm run build`
- 수동 확인: `falling-words`에서 1024px 전후 폭 기준 시작 화면과 좌측 네브 하단 트레이 확인
