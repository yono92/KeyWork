# plan.md

## 구현 전략
- `usePracticeText`를 로컬 데이터셋 전용 훅으로 단순화한다.
- `TypingInput`에서 위키 전용 상태와 폴백 공지를 제거한다.
- `app/api/wikipedia/route.ts`와 관련 테스트를 정리한다.
- `scripts/sync-practice-corpus.mjs`를 추가해 우리말샘 Open API 수집 + 공공데이터 파일 병합 + 정규화 + JSON 저장 흐름을 제공한다.

## 영향 파일
- `src/hooks/usePracticeText.ts`
- `src/components/TypingInput.tsx`
- `src/utils/sentenceUtils.ts`
- `tests/components/fallback-mode.test.tsx`
- `tests/api/routes.test.ts`
- `package.json`
- `.env.example`
- `specs/README.md`
- `scripts/sync-practice-corpus.mjs`

## 리스크 및 완화
- 리스크: 로컬 데이터셋 다양성이 줄어 체감 반복이 빨라질 수 있음
- 완화: 중복 방지 인덱스 순환을 유지하고, 수집 스크립트로 데이터셋 갱신 비용을 낮춘다
- 리스크: 우리말샘 검색 쿼리만으로 속담 전량 수집이 어렵다
- 완화: 다중 쿼리 + 공공데이터 파일 병합을 지원하고, 결과를 수동 검토 가능한 JSON으로 저장한다

## 테스트 전략
- `TypingInput` 폴백 UI 비노출 확인
- API 라우트 테스트에서 위키 의존 제거 확인
- 수집 스크립트 도움말 실행 확인
