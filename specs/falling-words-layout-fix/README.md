# README.md

## 기능 배경
- 단어낙하 화면이 특정 데스크톱 폭에서 과도하게 비어 보이고, 좌측 네브 하단 컨트롤 트레이가 겹쳐 보이는 회귀가 발생했다.

## 목적
- 단어낙하 게임판과 시작 오버레이의 레이아웃을 안정화하고, 좌측 네브 하단 설정 트레이가 중간 폭에서도 깨지지 않도록 정리한다.

## 범위
- `src/components/FallingWordsGame.tsx`
- `src/components/navigation/ControlTray.tsx`
- `src/components/SideNav.tsx`
- 필요 시 `src/components/ThemeToggle.tsx`

## 제외 범위
- 단어낙하 점수/난이도/아이템 로직 변경
- 사이드 네브 정보 구조 개편

## 성공 기준
- 1024px 전후 데스크톱 폭에서도 단어낙하 시작 화면이 어색하게 무너지지 않는다.
- 좌측 네브 하단 컨트롤이 사이드바 밖으로 넘치거나 겹치지 않는다.
- 기능 회귀 없이 `npm run lint`, `npm run test:run`, `npm run build`를 통과한다.
