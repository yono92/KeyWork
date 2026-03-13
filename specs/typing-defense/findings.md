# Typing Defense — Findings

## F1: useCallback 의존성 체인으로 인한 setInterval 재설정 버그
- **발견**: `startSpawnLoop` → `spawnEnemy` → `getEnemyWord` → `getRandomWord` 체인에서, `useKoreanWords`의 `koreanWords` 상태가 API fetch 후 변경되면 전체 체인이 재생성됨
- **증상**: setInterval이 매번 clear → restart 되어 적이 한 마리도 스폰되지 않음
- **해결**: `getRandomWord`를 ref(`getRandomWordRef`)로 관리하여 useCallback 의존성을 `[]`로 안정화
- **교훈**: 게임 루프에서 setInterval/requestAnimationFrame을 사용할 때, 콜백 내에서 참조하는 함수가 변경되면 루프가 재설정될 수 있음. ref 패턴 필수.
