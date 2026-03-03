# plan.md

## 아키텍처/접근
- 각 대상 모듈에 `recentWordsRef`를 도입해 최근 출제 단어를 추적한다.
- `getSharedPrefixLength`, `isTooSimilarWord` 유틸 함수를 모듈 내부 `useCallback`으로 구현한다.
- 후보 선택 단계에서 유사 단어를 우선 제외하고, 비어 있으면 원본 후보군으로 폴백한다.

## 영향 파일
- `src/components/TypingRunnerGame.tsx`
- `src/components/FallingWordsGame.tsx`
- `src/hooks/useKoreanWords.ts`

## 리스크 및 완화
- 리스크: 후보군 과도 축소로 동일 단어 반복 가능
- 완화: 항상 원본 후보군 폴백 유지

## 테스트 전략
- 자동: lint/test/build 수행
- 수동: `typing-runner`, `falling-words`에서 연속 출제 단어의 시작부 다양성 확인
