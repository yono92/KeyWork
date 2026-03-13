# findings.md

## 2026-03-13 구현 점검

### 확인된 상태
1. 업적 데이터 정의, 업적 조회 훅, 업적 검사 훅, 프로필 업적 UI는 이미 코드에 구현되어 있었다.
2. `tasks.md`는 전부 `대기`로 남아 있었고, `progress.md`는 `완료`로 기록돼 있어 SDD 문서 상태가 어긋나 있었다.
3. 업적 기능에 대한 전용 Vitest 커버리지가 없어 회귀를 빠르게 확인하기 어려운 상태였다.

### 반영 내용
1. `src/data/achievements.ts`에 `getNewlyUnlockedAchievements` 순수 헬퍼를 추가해 업적 판정 로직을 테스트 가능한 형태로 분리했다.
2. `tests/lib/achievements.test.ts`에서 업적 카탈로그 수/고유성, 신규 해금 판정, 전체 모드 업적 조건을 검증했다.
3. `tests/hooks/achievements.test.tsx`에서 비로그인 조회, 해금 상태 조인, 점수 제출 후 신규 업적 INSERT 흐름을 검증했다.
4. `tasks.md`, `progress.md`를 현재 구현 상태와 맞게 동기화했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과
- `npm run build`: 통과
