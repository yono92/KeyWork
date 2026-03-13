# findings.md

## 2026-03-13 구현 메모

### 결정
1. XP는 추가 DB 없이 기존 `game_scores`와 일일 미션 완료 이력에서 계산한다.
2. 플레이 XP는 판수, 멀티플레이, 승리, 높은 정확도 기준 보너스를 합산한다.
3. 일일 미션 보상 XP는 날짜별 플레이 기록으로 재계산해 누적 XP에 포함한다.

### 반영 내용
1. `src/lib/userStats.ts`에 XP/레벨 진행도 집계를 추가했다.
2. `src/components/LevelBadge.tsx`를 실제 배지 UI로 구현했다.
3. 프로필 상단 카드와 `오늘의 루프` 섹션에 레벨, 총 XP, 오늘 XP, 미션별 XP 보상을 노출했다.
4. `tests/lib/userStats.test.ts`를 확장해 XP/레벨 계산을 회귀 테스트로 고정했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과
- `npm run build`: 통과
